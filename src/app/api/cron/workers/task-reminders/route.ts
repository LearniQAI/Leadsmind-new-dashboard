import { NextResponse } from 'next/server';
import { ReminderScheduler } from '@/lib/execution/ReminderScheduler';
import { logger } from '@/shared/logger';
import { acquireCronWorkerLock, releaseCronWorkerLock } from '@/lib/cron/workerLock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Runs every minute (see vercel.json) — matches ReminderScheduler's own
// documented intent ("Intended to be run via a cron job every minute").
// dispatchDueReminders() already scans task_reminders across every
// workspace in one query (each row carries its own workspace_id/user_id),
// so there's no per-workspace loop needed here, unlike task-escalations.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerName = 'task-reminders';
  try {
    if (!await acquireCronWorkerLock(workerName, 55)) {
      return NextResponse.json({ success: true, skipped: true, message: 'A prior sweep is still running' });
    }
  } catch (err) {
    logger.error({ err }, 'cron.task_reminders.lock.failed');
    return NextResponse.json({ success: false, error: 'Could not acquire task-reminders lock' }, { status: 500 });
  }

  try {
    await ReminderScheduler.dispatchDueReminders();
  } catch (err) {
    logger.error({ err }, 'cron.task_reminders.failed');
    return NextResponse.json({ success: false, error: 'Task reminder sweep failed' }, { status: 500 });
  } finally {
    try { await releaseCronWorkerLock(workerName); } catch (err) { logger.error({ err }, 'cron.task_reminders.lock_release.failed'); }
  }

  return NextResponse.json({ success: true });
}
