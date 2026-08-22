import { NextRequest, NextResponse } from 'next/server';
import { runRescreening } from '../../../../../../workers/rescreen-aml';
import { logger } from '@/shared/logger';
import { acquireCronWorkerLock, releaseCronWorkerLock } from '@/lib/cron/workerLock';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return handleCronTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req);
}

async function handleCronTrigger(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerName = 'rescreen-aml';
  try {
    if (!await acquireCronWorkerLock(workerName, 6 * 60 * 60)) {
      return NextResponse.json({ success: true, skipped: true, message: 'A prior rescreening run is still active' });
    }
  } catch (err) {
    logger.error({ err }, 'cron.aml_rescreen.lock.failed');
    return NextResponse.json({ error: 'Could not acquire AML rescreening lock' }, { status: 500 });
  }

  try {
    // 2. Execute rescreening pipeline
    const result = await runRescreening();

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Automated AML rescreening job run successfully.',
      rescreenedCount: result.count,
    });
  } catch (err: any) {
    logger.error({ err }, 'cron.aml_rescreen.failed');
    return NextResponse.json({ error: 'AML rescreening job failed.' }, { status: 500 });
  } finally {
    try { await releaseCronWorkerLock(workerName); } catch (err) { logger.error({ err }, 'cron.aml_rescreen.lock_release.failed'); }
  }
}
