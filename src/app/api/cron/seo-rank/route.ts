import { NextResponse } from 'next/server';
import { triggerDataForSeoSync } from '@/app/actions/seo';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && key !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid cron access key.' }, { status: 401 });
    }

    const result = await triggerDataForSeoSync();
    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('[SEO Rank Sync API] Failed:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
