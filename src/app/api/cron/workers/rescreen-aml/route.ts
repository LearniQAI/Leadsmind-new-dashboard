import { NextRequest, NextResponse } from 'next/server';
import { runRescreening } from '../../../../../../workers/rescreen-aml';

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
    console.error('[AML Rescreen HTTP Cron] Internal error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
