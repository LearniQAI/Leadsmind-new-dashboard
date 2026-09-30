import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { inngest } from '@/lib/inngest';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BATCH_SIZE = 50;
const STALE_AFTER_MS = 2 * 60 * 1000;

// A form_automation_jobs row stays 'queued' only until workflowTriggerFn's first action flips it
// to 'running' — normally milliseconds. A row still 'queued' after 2 minutes means the Inngest
// enqueue was silently dropped or the function never picked it up, not that it's legitimately
// still working (a legitimately slow run would already be 'running'). This re-sends the original
// workflow/trigger event so Inngest picks it up again, and gives up (marks 'failed') once
// max_attempts is exhausted — matching the retry/give-up shape of the workflow-resume worker's
// claim/reclaim pattern for the same class of "stranded by a crashed/dropped invocation" problem.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS).toISOString();

  const { data: claimed, error } = await supabase.rpc('reclaim_stuck_automation_jobs', {
    p_stale_before: staleBefore,
    p_batch_size: BATCH_SIZE,
  });

  if (error) {
    logger.error({ err: error }, 'cron.automation_jobs_reconciler.claim_failed');
    return NextResponse.json({ success: false, error: 'Reconciler claim failed' }, { status: 500 });
  }

  let resent = 0;
  let failed = 0;

  for (const job of claimed ?? []) {
    if (job.attempts >= job.max_attempts) {
      const { error: failError } = await supabase
        .from('form_automation_jobs')
        .update({
          status: 'failed',
          last_error: `Stuck in 'queued' after ${job.attempts} attempt(s) — automation was never picked up by the worker.`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', job.id)
        .eq('status', 'queued'); // don't overwrite if it started running between the claim and here
      if (failError) {
        logger.error({ err: failError, jobId: job.id }, 'cron.automation_jobs_reconciler.mark_failed_failed');
      } else {
        failed++;
      }
      continue;
    }

    try {
      // job.payload is stored as { event, payload } — the exact shape TriggerDispatcher.dispatch
      // sends as the Inngest event's data, minus jobId (not yet known when the row was created).
      // Injecting job.id here (the row's own id) reconstructs the original event exactly.
      const data = { ...job.payload, payload: { ...job.payload.payload, jobId: job.id } };
      // Same event id as the original dispatch: if the first invocation is actually still
      // in-flight (not truly stuck — e.g. this reconciler run raced the claim window), Inngest's
      // own id-based dedup silently no-ops this send rather than starting a second run. The
      // 'queued'->'running' claim in workflowTriggerFn (see workflowTrigger.ts) is the second,
      // DB-level guard for the same "can't double-run" requirement, independent of Inngest's dedup.
      await inngest.send({
        id: job.id,
        name: 'workflow/trigger',
        data,
      });
      resent++;
    } catch (err) {
      logger.error({ err, jobId: job.id }, 'cron.automation_jobs_reconciler.resend_failed');
    }
  }

  return NextResponse.json({ success: true, resent, failed, claimed: claimed?.length ?? 0 });
}
