import { NextResponse } from 'next/server';
import { advanceExpiredWaitlistOffers } from '@/lib/calendar/waitlist';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Task 65 — every waitlist offer has a 2-hour window. The DB trigger only
// advances the queue when a spot frees; it does nothing when an offer simply
// lapses unaccepted. This cron passes lapsed offers to the next person on the
// list (and emails them), so a spot never gets silently stuck on someone who
// isn't going to claim it. Scheduled hourly in vercel.json.
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await advanceExpiredWaitlistOffers();
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    logger.error({ err }, 'cron.waitlist_offers.failed');
    return NextResponse.json({ error: 'Waitlist offer advancement failed' }, { status: 500 });
  }
}
