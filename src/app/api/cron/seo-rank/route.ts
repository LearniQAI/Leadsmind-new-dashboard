import { NextResponse } from 'next/server';
import { triggerDataForSeoSync } from '@/app/actions/seo';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await triggerDataForSeoSync();
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.seo_rank_sync.failed');
    return NextResponse.json({ success: false, error: 'SEO rank sync failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
