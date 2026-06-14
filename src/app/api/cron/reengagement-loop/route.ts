import { NextRequest, NextResponse } from 'next/server';
import { runReengagementLoop } from '../../../../../libs/workers/src/crons/reengagement-loop';

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

    const result = await runReengagementLoop();

    return NextResponse.json({
      success: true,
      result
    });
  } catch (err: any) {
    console.error('[API Cron Re-engagement Loop] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
