import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { runClaimedExecution } from '@/lib/automation/executor';
import { logger } from '@/shared/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BATCH_SIZE = 50;
// Stop taking new batches after this long so a big backlog can't run into the platform's
// function time limit; whatever is left is picked up by the next tick.
const TIME_BUDGET_MS = 45_000;

// Workflow executions are the fifth work queue (with the email/SMS/WhatsApp campaign queues
// and Communications Hub messages). This is its worker, on the same claim/reclaim pattern:
// acquire_workflow_executions atomically claims due executions (FOR UPDATE SKIP LOCKED), so
// two overlapping cron runs -- or a cron run and the request that just enrolled a contact --
// can never both run the same step. "Due" covers an elapsed wait, an elapsed business-hours
// hold, an elapsed retry backoff, AND a run stranded 'running' by a crashed worker (its lock
// went stale). A run reclaimed 3 times is marked failed by the function itself.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const workerId = `wf_cron_${crypto.randomUUID()}`;
  const startedAt = Date.now();
  let resumed = 0;
  let failed = 0;

  try {
    while (Date.now() - startedAt < TIME_BUDGET_MS) {
      const { data: claimed, error } = await supabase.rpc('acquire_workflow_executions', {
        worker_id: workerId,
        batch_size: BATCH_SIZE,
        target_execution_id: null,
      });
      if (error) throw error;
      if (!claimed || claimed.length === 0) break;

      for (const execution of claimed) {
        try {
          await runClaimedExecution(execution.id, workerId);
          resumed++;
        } catch (err) {
          failed++;
          logger.error({ err, executionId: execution.id }, 'cron.workflow_resume.step_failed');
        }
      }
      if (claimed.length < BATCH_SIZE) break;
    }
  } catch (err) {
    logger.error({ err }, 'cron.workflow_resume.failed');
    return NextResponse.json({ success: false, error: 'Workflow resume sweep failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, resumed, failed });
}
