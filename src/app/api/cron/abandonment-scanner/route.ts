import { NextRequest, NextResponse } from 'next/server';
import { scanForAbandonment } from '../../../../../libs/workers/src/crons/abandonment-scanner';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await scanForAbandonment();

    return NextResponse.json({
      success: true,
      result
    });
  } catch (err: any) {
    logger.error({ err }, 'cron.abandonment_scanner.failed');
    return NextResponse.json({ error: 'Abandonment scan failed.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
