import { NextRequest, NextResponse } from 'next/server';
import { runRescreening } from '../../../../../../workers/rescreen-aml';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleCronTrigger(req);
}

export async function POST(req: NextRequest) {
  return handleCronTrigger(req);
}

async function handleCronTrigger(req: NextRequest) {
  try {
    // 1. Basic security validation (secret cron authorization token)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[AML Rescreen HTTP Cron] Unauthorized trigger attempt.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('[AML Rescreen HTTP Cron] Internal error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
