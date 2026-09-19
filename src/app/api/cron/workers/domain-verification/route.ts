import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { acquireCronWorkerLock, releaseCronWorkerLock } from '@/lib/cron/workerLock';
import { verifyDns, verifyWebsiteDomainById } from '@/lib/domains/verify';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Re-checks domains that are still waiting on DNS so users don't have to keep clicking Verify.
// Same check as the Verify button (verifyDns / verifyWebsiteDomainById), so the sequence is
// unchanged: nothing is attached to Vercel until the TXT ownership token is found, which means a
// domain whose DNS never gets set up costs one DNS lookup per pass and nothing else.
//
// Bounds, so this can't grow without limit:
//  - only rows younger than MAX_AGE_DAYS (an abandoned domain stops being polled; the user can
//    still click Verify to check it, which resumes nothing automatically),
//  - never re-check a row checked in the last MIN_RECHECK_MINUTES (a manual click just now),
//  - at most BATCH rows per table per run, least-recently-checked first, inside a time budget.
const MAX_AGE_DAYS = 14;
const MIN_RECHECK_MINUTES = 10;
const BATCH = 40;
const TIME_BUDGET_MS = 50_000;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerName = 'domain-verification';
  try {
    if (!await acquireCronWorkerLock(workerName, 10 * 60)) {
      return NextResponse.json({ success: true, skipped: true, message: 'A prior sweep is still running' });
    }
  } catch (err) {
    logger.error({ err }, 'cron.domain_verification.lock.failed');
    return NextResponse.json({ success: false, error: 'Could not acquire domain-verification lock' }, { status: 500 });
  }

  const supabase = createAdminClient();
  const startedAt = Date.now();
  const results = { checked: 0, activated: 0, stillWaiting: 0, failed: 0 };
  const withinBudget = () => Date.now() - startedAt < TIME_BUDGET_MS;

  try {
    const now = Date.now();
    const oldestAllowed = new Date(now - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const recheckBefore = new Date(now - MIN_RECHECK_MINUTES * 60 * 1000).toISOString();
    const notRecentlyChecked = `last_check_at.is.null,last_check_at.lt.${recheckBefore}`;

    const { data: customDomains, error: customErr } = await supabase
      .from('domain_configurations')
      .select('id')
      .neq('status', 'active')
      .gt('created_at', oldestAllowed)
      .or(notRecentlyChecked)
      .order('last_check_at', { ascending: true, nullsFirst: true })
      .limit(BATCH);
    if (customErr) throw customErr;

    for (const { id } of customDomains ?? []) {
      if (!withinBudget()) break;
      try {
        const r = await verifyDns(id);
        results.checked++;
        if (r.success) results.activated++;
        else results.stillWaiting++;
      } catch (err) {
        results.failed++;
        logger.error({ err, domainId: id }, 'cron.domain_verification.custom.failed');
      }
    }

    const { data: websiteDomains, error: websiteErr } = await supabase
      .from('builder_published_domains')
      .select('id')
      .or('verified.is.null,verified.eq.false')
      .gt('created_at', oldestAllowed)
      .or(notRecentlyChecked)
      .order('last_check_at', { ascending: true, nullsFirst: true })
      .limit(BATCH);
    if (websiteErr) throw websiteErr;

    for (const { id } of websiteDomains ?? []) {
      if (!withinBudget()) break;
      try {
        const r = await verifyWebsiteDomainById(id);
        results.checked++;
        if (r.ready) results.activated++;
        else results.stillWaiting++;
      } catch (err) {
        results.failed++;
        logger.error({ err, domainId: id }, 'cron.domain_verification.website.failed');
      }
    }
  } catch (err) {
    logger.error({ err }, 'cron.domain_verification.failed');
    return NextResponse.json({ success: false, error: 'Domain verification sweep failed' }, { status: 500 });
  } finally {
    try { await releaseCronWorkerLock(workerName); } catch (err) { logger.error({ err }, 'cron.domain_verification.lock_release.failed'); }
  }

  return NextResponse.json({ success: true, results });
}
