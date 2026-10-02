import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/database/datasource';
import { ResearchAgent, ResearchFailedError } from '@/server/services/ai/ResearchAgent';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { toClientError } from '@/shared/errors/AppError';
import { getRequestId } from '@/shared/logger/requestId';
import { createStepTimer, logRequestComplete } from '@/shared/logger/requestTiming';
import { logger } from '@/shared/logger';
import { AI_RESEARCH_ENABLED } from '@/lib/featureFlags/aiResearch';

export const dynamic = 'force-dynamic';
// Up to 5 contacts run in parallel; each has a 30s OpenAI timeout with one retry.
export const maxDuration = 90;

const MAX_CONTACTS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
// A personal mailbox domain says nothing about the contact's company.
const FREE_MAIL_DOMAINS = new Set(['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com', 'aol.com', 'proton.me', 'protonmail.com']);

type ItemFailure = 'not_found' | 'no_company_domain' | 'insufficient_credits' | 'timeout' | 'provider_error' | 'empty_result' | 'invalid_result' | 'save_failed';

export async function POST(req: NextRequest) {
  const requestId = getRequestId(req.headers);
  const timer = createStepTimer();
  let workspaceIdForLog: string | null = null;
  let status = 200;

  try {
    if (!AI_RESEARCH_ENABLED) {
      status = 404;
      return NextResponse.json({ error: 'AI research is not available.' }, { status });
    }

    // Resolves the real, session-active workspace (the same active_workspace_id cookie +
    // membership convention used everywhere else in this app) — never a client-supplied
    // workspaceId, which would let a caller run paid AI enrichment on another workspace's
    // contacts and bill it to (or leak results into) their own.
    const { workspaceId } = await requireWorkspaceRole();
    workspaceIdForLog = workspaceId;

    const body = await req.json().catch(() => null);
    const contactIds: unknown = body?.contactIds;
    const explicitDomain = typeof body?.domain === 'string' ? body.domain.trim().toLowerCase() : '';

    if (!Array.isArray(contactIds) || contactIds.length === 0) {
      status = 400;
      return NextResponse.json({ error: 'contactIds must be a non-empty array.' }, { status });
    }
    if (contactIds.length > MAX_CONTACTS) {
      status = 400;
      return NextResponse.json({ error: `At most ${MAX_CONTACTS} contacts per request.` }, { status });
    }
    if (!contactIds.every((id) => typeof id === 'string' && UUID_RE.test(id))) {
      status = 400;
      return NextResponse.json({ error: 'contactIds must be valid UUIDs.' }, { status });
    }
    if (explicitDomain && !DOMAIN_RE.test(explicitDomain)) {
      status = 400;
      return NextResponse.json({ error: 'domain is not a valid domain name.' }, { status });
    }
    const targets = Array.from(new Set(contactIds as string[]));

    const results = await Promise.all(targets.map(async (contactId) => {
      const fail = (error: ItemFailure) => ({ contactId, success: false as const, error });
      try {
        // Scoped to the caller's real workspace — a contactId from another workspace is
        // rejected rather than enriched and billed here.
        const contact = await db('contacts').where({ id: contactId, workspace_id: workspaceId }).first();
        if (!contact) return fail('not_found');

        const contactName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || 'Contact';

        const emailDomain = typeof contact.email === 'string' ? contact.email.split('@')[1]?.toLowerCase() : undefined;
        const targetDomain = explicitDomain || (emailDomain && !FREE_MAIL_DOMAINS.has(emailDomain) ? emailDomain : '');
        if (!targetDomain) return fail('no_company_domain');

        const companyRecord = await db('crm_companies').where({ domain: targetDomain, workspace_id: workspaceId }).first();
        const domainPart = targetDomain.split('.')[0];
        const companyName = companyRecord?.name || domainPart.charAt(0).toUpperCase() + domainPart.slice(1);

        const report = await ResearchAgent.enrichContact(
          contactId, contactName, companyName, targetDomain, workspaceId, requestId, { chargeCredit: true }
        );
        return { contactId, success: true as const, report };
      } catch (itemErr) {
        if (itemErr instanceof ResearchFailedError) return fail(itemErr.code);
        logger.error({ requestId, workspaceId, contactId }, 'ai_research.batch.item_failed');
        return fail('provider_error');
      }
    }));
    timer.mark('enrich_contacts');

    const failed = results.filter((r) => !r.success);
    if (failed.length === results.length) {
      const allCredits = failed.every((f) => (f as { error: string }).error === 'insufficient_credits');
      status = allCredits ? 402 : 502;
    }

    return NextResponse.json(
      {
        success: failed.length === 0,
        processedCount: results.length,
        failedCount: failed.length,
        details: results,
      },
      { status }
    );
  } catch (error: any) {
    logger.error({ requestId, workspaceId: workspaceIdForLog, name: error?.name }, 'ai_research.batch.failed');
    const clientError = toClientError(error);
    status = clientError.status;
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  } finally {
    logRequestComplete({
      requestId,
      route: '/api/v1/ai/research/batch',
      method: 'POST',
      status,
      durationMs: timer.totalMs(),
      steps: timer.steps(),
      workspaceId: workspaceIdForLog,
    });
  }
}
