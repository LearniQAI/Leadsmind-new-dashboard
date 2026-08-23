import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { acquireCronWorkerLock, releaseCronWorkerLock } from '@/lib/cron/workerLock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Fixed allow-list — the LLM can only propose tags from this set (plus a short
// free-text justification), it never invents arbitrary tag names. These are the
// PRD's genuinely-AI-judgment tags: real deterministic data exists for everything
// else (see the auto-tag-sweep worker), these four require actual reasoning over
// behavior signals, which is why they go through ai_recommendations for human
// review rather than being auto-applied like the rule-based tags.
const CANDIDATE_TAGS = ['High Purchase Intent', 'Likely To Churn', 'Decision Maker', 'Price Sensitive'];
const MIN_CONFIDENCE = 0.4;
const ACTIVITY_WINDOW_DAYS = 14;
const BATCH_SIZE_PER_WORKSPACE = 25;

interface Suggestion {
  tag: string;
  confidence: number;
  reason: string;
}

async function evaluateContact(supabase: any, workspaceId: string, contact: any): Promise<Suggestion[]> {
  const { data: canSpend } = await supabase.rpc('deduct_ai_credit', { p_workspace_id: workspaceId, p_amount: 2 });
  if (!canSpend) {
    logger.info({ workspaceId }, 'cron.ai_tag_suggestions.credit_limit_reached');
    return [];
  }

  const [{ data: activities }, { data: emailEvents }, { data: deals }] = await Promise.all([
    supabase
      .from('contact_activities')
      .select('type, description, created_at')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('email_events')
      .select('event_type, occurred_at')
      .eq('contact_id', contact.id)
      .order('occurred_at', { ascending: false })
      .limit(10),
    supabase.from('opportunities').select('status, value').eq('contact_id', contact.id),
  ]);

  const signals = {
    lead_score: contact.lead_score ?? 0,
    lead_score_explanation: contact.lead_score_explanation ?? '',
    recent_activities: (activities ?? []).map((a: any) => `${a.type}: ${a.description}`),
    recent_email_events: (emailEvents ?? []).map((e: any) => e.event_type),
    deals: (deals ?? []).map((d: any) => ({ status: d.status, value: d.value })),
  };

  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: `You are scoring a CRM contact for behavioral tags based ONLY on the JSON signals below — do not invent facts not present here.
Allowed tags (use ONLY these, omit any that don't apply): ${CANDIDATE_TAGS.join(', ')}.
Signals: ${JSON.stringify(signals)}
Respond with JSON: {"suggestions": [{"tag": "<one of the allowed tags>", "confidence": <0 to 1>, "reason": "<short reason citing a specific signal above>"}]}
Only include a tag if the signals genuinely support it. Empty array if nothing applies.`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{"suggestions":[]}');
    const suggestions: Suggestion[] = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
    return suggestions.filter((s) => CANDIDATE_TAGS.includes(s.tag) && s.confidence >= MIN_CONFIDENCE);
  } catch (err) {
    logger.error({ err, workspaceId, contactId: contact.id }, 'cron.ai_tag_suggestions.llm_call.failed');
    return [];
  }
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerName = 'ai-tag-suggestions';
  try {
    if (!await acquireCronWorkerLock(workerName, 6 * 60 * 60)) {
      return NextResponse.json({ success: true, skipped: true, message: 'A prior sweep is still running' });
    }
  } catch (err) {
    logger.error({ err }, 'cron.ai_tag_suggestions.lock.failed');
    return NextResponse.json({ success: false, error: 'Could not acquire AI tag-suggestions lock' }, { status: 500 });
  }

  const supabase = createAdminClient();
  let evaluated = 0;
  let proposed = 0;

  try {
    const cutoff = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: workspaces, error: wsErr } = await supabase.from('ai_usage_credits').select('workspace_id');
    if (wsErr) throw wsErr;

    for (const ws of workspaces ?? []) {
      const { data: contacts, error: contactErr } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, lead_score, lead_score_explanation, tags')
        .eq('workspace_id', ws.workspace_id)
        .gte('last_activity_at', cutoff)
        .limit(BATCH_SIZE_PER_WORKSPACE);
      if (contactErr) {
        logger.error({ err: contactErr, workspaceId: ws.workspace_id }, 'cron.ai_tag_suggestions.contacts_fetch.failed');
        continue;
      }

      for (const contact of contacts ?? []) {
        // Skip contacts that already have a pending recommendation, to avoid
        // re-proposing the same thing every day before a human reviews it.
        const { data: existingPending } = await supabase
          .from('ai_recommendations')
          .select('id')
          .eq('workspace_id', ws.workspace_id)
          .eq('entity_type', 'contact')
          .eq('entity_id', contact.id)
          .eq('status', 'pending')
          .limit(1);
        if (existingPending && existingPending.length > 0) continue;

        evaluated++;
        const suggestions = await evaluateContact(supabase, ws.workspace_id, contact);

        for (const suggestion of suggestions) {
          const { error: insertErr } = await supabase.from('ai_recommendations').insert({
            workspace_id: ws.workspace_id,
            entity_type: 'contact',
            entity_id: contact.id,
            suggested_tag_name: suggestion.tag,
            confidence_score: suggestion.confidence,
            status: 'pending',
          });
          if (insertErr) {
            logger.error({ err: insertErr, workspaceId: ws.workspace_id, contactId: contact.id }, 'cron.ai_tag_suggestions.insert.failed');
          } else {
            proposed++;
          }
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'cron.ai_tag_suggestions.failed');
    return NextResponse.json({ success: false, error: 'AI tag suggestion job failed' }, { status: 500 });
  } finally {
    try { await releaseCronWorkerLock(workerName); } catch (err) { logger.error({ err }, 'cron.ai_tag_suggestions.lock_release.failed'); }
  }

  return NextResponse.json({ success: true, evaluated, proposed });
}
