import OpenAI from 'openai';
import { db, supabase } from '../../database/datasource';
import { logger, safeLog } from '@/shared/logger';
import { createStepTimer } from '@/shared/logger/requestTiming';
import { consumeAICredit, refundAICredit } from '@/lib/ai/creditGuard';
import { CreditLimitExceededError } from '@/shared/errors/AppError';

// Bumped when the stored report shape/semantics change. Cache reads only trust rows at this
// version, so rows written by the earlier canned-data agent (no schema_version) can never be
// served as research results.
export const RESEARCH_REPORT_SCHEMA_VERSION = 2;

const OPENAI_TIMEOUT_MS = 30_000;

export type ResearchFailureCode =
  | 'insufficient_credits'
  | 'timeout'
  | 'provider_error'
  | 'empty_result'
  | 'invalid_result'
  | 'save_failed';

// A real, typed failure. Callers report it as a failed item — nothing is saved and no
// placeholder report is invented.
export class ResearchFailedError extends Error {
  userSafe = true;
  constructor(public code: ResearchFailureCode) {
    super(code);
    this.name = 'ResearchFailedError';
  }
}

function isTimeout(err: any): boolean {
  return err?.name === 'APIConnectionTimeoutError' || err?.name === 'TimeoutError' || err?.name === 'AbortError';
}

// The model is given ONLY what the CRM already knows. There is no search or scrape source, so it
// must not invent employers, events, news or numbers; unknown stays empty.
const SYSTEM_PROMPT = [
  'You help a salesperson prepare for a conversation with a contact.',
  'Use ONLY the facts provided in the user message. You have no internet access.',
  'Never invent employers, job titles, events, news, headcount, technology, or personal details.',
  'If something is not stated in the provided facts, leave it empty ("" or []).',
  'Do NOT include personal non-professional details (home address, personal phone, family).',
  'Return a JSON object with exactly these keys:',
  'professional_summary (string), likely_role (string), strategic_focus_areas (string[]),',
  'inferred_pain_points (string[]), suggested_conversation_openers (string[]).',
].join(' ');

function hasContent(r: any): boolean {
  if (!r || typeof r !== 'object') return false;
  return ['professional_summary', 'likely_role'].some((k) => typeof r[k] === 'string' && r[k].trim()) ||
    ['strategic_focus_areas', 'inferred_pain_points', 'suggested_conversation_openers'].some((k) => Array.isArray(r[k]) && r[k].length > 0);
}

export class ResearchAgent {
  /**
   * Builds a brief from the contact's CRM facts. Throws ResearchFailedError on any failure and
   * saves nothing in that case. With `chargeCredit`, one AI credit is deducted atomically before
   * the model call and refunded if the run fails (cache hits are free).
   */
  public static async enrichContact(
    contactId: string,
    contactName: string,
    companyName: string,
    domain: string,
    workspaceId: string,
    requestId?: string,
    opts: { chargeCredit?: boolean } = {}
  ): Promise<any> {
    const timer = createStepTimer();
    const logStep = (outcome: 'cache_hit' | 'completed' | 'error', code?: ResearchFailureCode) => safeLog(() =>
      logger.info(
        { requestId, workspaceId, contactId, outcome, code, durationMs: Math.round(timer.totalMs()), steps: timer.steps() },
        'ai_research.enrich_contact'
      )
    );

    // Cache: this workspace + contact + domain, unexpired, and written by the current agent.
    const { data: cachedReport } = await supabase
      .from('ai_research_reports')
      .select('report_json')
      .eq('workspace_id', workspaceId)
      .eq('contact_id', contactId)
      .eq('company_domain', domain)
      .eq('research_type', 'contact_enrichment')
      .eq('report_json->>schema_version', String(RESEARCH_REPORT_SCHEMA_VERSION))
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    timer.mark('cache_lookup');

    if (cachedReport) {
      logStep('cache_hit');
      return cachedReport.report_json;
    }

    let charged = false;
    try {
      if (opts.chargeCredit) {
        try {
          await consumeAICredit(workspaceId);
          charged = true;
        } catch (err) {
          if (err instanceof CreditLimitExceededError) throw new ResearchFailedError('insufficient_credits');
          throw new ResearchFailedError('provider_error');
        }
        timer.mark('credit_deduct');
      }

      if (!process.env.OPENAI_API_KEY) throw new ResearchFailedError('provider_error');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: OPENAI_TIMEOUT_MS, maxRetries: 1 });

      const companyRecord = await db('crm_companies').where({ domain, workspace_id: workspaceId }).first();
      timer.mark('company_lookup');

      const facts = {
        contact_name: contactName,
        company_name: companyName,
        company_domain: domain,
        company_industry: companyRecord?.industry ?? null,
        company_employees: companyRecord?.employees ?? null,
      };

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `Known facts (JSON): ${JSON.stringify(facts)}` },
          ],
          response_format: { type: 'json_object' },
        });
      } catch (err) {
        throw new ResearchFailedError(isTimeout(err) ? 'timeout' : 'provider_error');
      }
      timer.mark('openai_call');

      const rawContent = completion.choices[0]?.message?.content;
      if (!rawContent) throw new ResearchFailedError('empty_result');

      // Privacy protection filters (strip phone numbers, home addresses, private emails, family).
      const phoneRegex = /(\+?[0-9]{1,4}[-.\s]??)?[0-9]{2,3}[-.\s]??[0-9]{3,4}[-.\s]??[0-9]{4}/g;
      const privateEmailRegex = /[a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|icloud|live)\.com/gi;
      const addressRegex = /\d+\s+[A-Za-z0-9\s]{3,}\s*(Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Boulevard|Blvd|Lane|Ln|Way)/gi;
      const familyRegex = /(lives\s+with\s+(his|her)\s+(\w+\s+)?(wife|husband|kids|children|son|daughter)|spending\s+time\s+with\s+(his|her)\s+(\w+\s+)?(wife|husband|kids|children|son|daughter)|married\s+to\s+[A-Za-z\s]+|enjoys\s+[\w\s]+(kids|children|son|daughter|wife|husband|family))/gi;
      const clean = rawContent
        .replace(phoneRegex, '[REDACTED PHONE]')
        .replace(privateEmailRegex, '[REDACTED EMAIL]')
        .replace(addressRegex, '[REDACTED ADDRESS]')
        .replace(familyRegex, '[REDACTED FAMILY]');

      let parsed: any;
      try {
        parsed = JSON.parse(clean);
      } catch {
        throw new ResearchFailedError('invalid_result');
      }
      if (!hasContent(parsed)) throw new ResearchFailedError('empty_result');

      const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()) : []);
      const role = typeof parsed.likely_role === 'string' ? parsed.likely_role.trim() : '';

      const reportJson = {
        schema_version: RESEARCH_REPORT_SCHEMA_VERSION,
        generated_from: 'crm_data_only',
        company_snapshot: { legal_name: companyName, domain },
        plain_language_operational_profile: typeof parsed.professional_summary === 'string' ? parsed.professional_summary : '',
        key_decision_makers: role ? [{ name: contactName, role }] : [],
        inferred_pain_points: strings(parsed.inferred_pain_points),
        suggested_conversation_openers: strings(parsed.suggested_conversation_openers),
        individual_profile: {
          professional_summary: typeof parsed.professional_summary === 'string' ? parsed.professional_summary : '',
          strategic_focus_areas: strings(parsed.strategic_focus_areas),
        },
      };

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // No lead score: there is no real signal source to score from, and a constant 100 told
      // users every contact was a perfect fit.
      const { error: insertError } = await db('ai_research_reports').insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        company_domain: domain,
        company_name: companyName,
        research_type: 'contact_enrichment',
        report_json: reportJson,
        lead_score: null,
        lead_score_breakdown: {},
        sources_used: [],
        tokens_used: completion.usage?.total_tokens ?? 0,
        expires_at: expiresAt.toISOString(),
      }).then(() => ({ error: null }), (e: unknown) => ({ error: e }));
      timer.mark('report_insert');
      if (insertError) {
        safeLog(() => logger.error({ requestId, workspaceId, contactId }, 'ai_research.report_insert.failed'));
        throw new ResearchFailedError('save_failed');
      }

      try {
        await db('crm_activities').insert({
          workspace_id: workspaceId,
          entity_type: 'contact',
          entity_id: contactId,
          activity_type: 'note',
          content: `[AI Research] Prepared a brief for ${contactName} from the contact's CRM details.`,
          metadata: {},
        });
      } catch {
        safeLog(() => logger.warn({ requestId, workspaceId, contactId }, 'ai_research.activity_insert.failed'));
      }

      logStep('completed');
      return reportJson;
    } catch (err) {
      const failure = err instanceof ResearchFailedError ? err : new ResearchFailedError('provider_error');
      let refunded = false;
      if (charged) refunded = await refundAICredit(workspaceId);
      safeLog(() => logger.error(
        { requestId, workspaceId, contactId, code: failure.code, charged, refunded },
        'ai_research.enrich_contact.failed'
      ));
      logStep('error', failure.code);
      throw failure;
    }
  }
}
