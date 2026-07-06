import { NextResponse } from 'next/server';
import { runGscSync } from '../../../../../workers/gsc-sync';
import { logger } from '@/shared/logger';

// Mark as dynamic to avoid static generation build failures
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runGscSync();
    
    if (result.status === 'failure') {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.gsc_sync.failed');
    return NextResponse.json({ success: false, error: 'GSC sync failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
