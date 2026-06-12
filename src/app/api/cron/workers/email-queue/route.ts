import { NextRequest, NextResponse } from 'next/server';
import { processEmailQueue, processDelayedActions } from '../../../../../../libs/infra/src/queues/email-queue';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process 20 email jobs and 20 delayed actions per cron run
    const emailResult = await processEmailQueue(20);
    const actionsResult = await processDelayedActions(20);

    return NextResponse.json({
      success: true,
      emails: emailResult,
      actions: actionsResult
    });
  } catch (err: any) {
    console.error('[API Cron Email Queue] Error running queue:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
