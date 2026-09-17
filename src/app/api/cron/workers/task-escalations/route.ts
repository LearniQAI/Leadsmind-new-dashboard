import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { EscalationHandler } from '@/lib/execution/EscalationHandler';
import { logger } from '@/shared/logger';
import { acquireCronWorkerLock, releaseCronWorkerLock } from '@/lib/cron/workerLock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Runs daily (see vercel.json) — matches EscalationHandler's own documented
// intent ("Intended to be run via a cron job daily"). Finds the distinct set
// of workspaces that actually have a task overdue by more than 48 hours in
// one query, then calls EscalationHandler.escalateOverdueTasks(workspaceId)
// per affected workspace — cheaper than looping every workspace in the
// system when most have nothing overdue, while keeping that function's
// existing per-workspace signature (it's also usable standalone, e.g. from
// a future per-workspace settings action).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerName = 'task-escalations';
  try {
    if (!await acquireCronWorkerLock(workerName, 60 * 60)) {
      return NextResponse.json({ success: true, skipped: true, message: 'A prior sweep is still running' });
    }
  } catch (err) {
    logger.error({ err }, 'cron.task_escalations.lock.failed');
    return NextResponse.json({ success: false, error: 'Could not acquire task-escalations lock' }, { status: 500 });
  }

  const supabase = createAdminClient();
  let workspacesProcessed = 0;

  try {
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - 2);
    const thresholdDateStr = thresholdDate.toISOString().split('T')[0];

    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select('workspace_id')
      .neq('status', 'done')
      .lt('due_date', thresholdDateStr);
    if (error) throw error;

    const workspaceIds = [...new Set((overdueTasks ?? []).map((t) => t.workspace_id))];

    for (const workspaceId of workspaceIds) {
      try {
        await EscalationHandler.escalateOverdueTasks(workspaceId);
        workspacesProcessed++;
      } catch (err) {
        logger.error({ err, workspaceId }, 'cron.task_escalations.workspace.failed');
      }
    }
  } catch (err) {
    logger.error({ err }, 'cron.task_escalations.failed');
    return NextResponse.json({ success: false, error: 'Task escalation sweep failed' }, { status: 500 });
  } finally {
    try { await releaseCronWorkerLock(workerName); } catch (err) { logger.error({ err }, 'cron.task_escalations.lock_release.failed'); }
  }

  return NextResponse.json({ success: true, results: { workspacesProcessed } });
}
