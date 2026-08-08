import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { processNextStep } from '@/lib/automation/executor';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// executor.ts's `wait` step and business-hours hold correctly persist a
// resume_at/held_until timestamp on workflow_executions.context and know how
// to continue once that time has passed -- but processNextStep is only ever
// called recursively from within the same request that started the run.
// Nothing else calls it, so a paused execution sits forever unless something
// external sweeps for expired holds and resumes them. This is that sweep.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();
  let resumed = 0;
  let failed = 0;

  try {
    // context is JSONB; resume_at/held_until are ISO strings when set.
    // ISO 8601 UTC ('Z'-suffixed) timestamps compare correctly with plain
    // lexicographic <= , so ->> text comparison against nowIso is valid.
    // Two separate queries (not .or() with an interpolated raw filter
    // string) to avoid PostgREST filter-string parsing edge cases around
    // the dots in a timestamp value.
    const [resumeDue, holdDue] = await Promise.all([
      supabase.from('workflow_executions').select('id').eq('status', 'running').lte('context->>resume_at', nowIso),
      supabase.from('workflow_executions').select('id').eq('status', 'running').lte('context->>held_until', nowIso),
    ]);
    if (resumeDue.error) throw resumeDue.error;
    if (holdDue.error) throw holdDue.error;

    const dueIds = new Set([...(resumeDue.data ?? []), ...(holdDue.data ?? [])].map((r) => r.id));

    for (const executionId of dueIds) {
      try {
        await processNextStep(executionId);
        resumed++;
      } catch (err) {
        failed++;
        logger.error({ err, executionId }, 'cron.workflow_resume.step_failed');
      }
    }
  } catch (err) {
    logger.error({ err }, 'cron.workflow_resume.failed');
    return NextResponse.json({ success: false, error: 'Workflow resume sweep failed' }, { status: 500 });
  }

  return NextResponse.json({ success: true, resumed, failed });
}
