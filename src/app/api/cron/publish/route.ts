import { NextResponse } from 'next/server';
import { checkAndPublishScheduledPosts } from '@/app/actions/blog';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkAndPublishScheduledPosts();
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.blog_publish.failed');
    return NextResponse.json({ success: false, error: 'Scheduled publish check failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
