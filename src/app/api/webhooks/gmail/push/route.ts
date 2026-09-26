import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { syncMailbox } from '@/lib/gmail/sync';
import { verifyPubSubToken } from '@/lib/gmail/pubsubAuth';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

// Gmail push notifications (Conversations batch 5), delivered by a Google Cloud Pub/Sub PUSH
// subscription on GMAIL_PUBSUB_TOPIC and authenticated by its OIDC token (see lib/gmail/pubsubAuth).
// The payload only says "mailbox X changed, historyId N"; the sync then reads Gmail itself with the
// mailbox's own token, so even a forged notice could at most trigger a sync.

const INLINE_SYNC_BUDGET_MS = 20_000;

export async function POST(request: Request) {
  if (!(await verifyPubSubToken(request.headers.get('authorization'), request.url))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let notice: { emailAddress?: string; historyId?: string | number } = {};
  try {
    const body = await request.json();
    notice = JSON.parse(Buffer.from(String(body?.message?.data || ''), 'base64').toString('utf8'));
  } catch {
    // Malformed: acknowledge (2xx) so Pub/Sub doesn't redeliver it forever.
    return new NextResponse(null, { status: 204 });
  }
  const address = String(notice.emailAddress || '').trim().toLowerCase();
  if (!address) return new NextResponse(null, { status: 204 });

  const admin = createAdminClient();
  const { data: mailboxes } = await admin
    .from('email_mailboxes')
    .select('id')
    .eq('email_address', address)
    .eq('provider', 'gmail')
    .not('connection_id', 'is', null);

  // Flag first: if the inline sync is busy / cut short, the cron worker picks it up within a minute.
  for (const m of mailboxes || []) {
    await admin.from('email_mailboxes').update({ sync_requested_at: new Date().toISOString() }).eq('id', m.id);
  }
  for (const m of mailboxes || []) {
    const res = await syncMailbox(m.id, { budgetMs: INLINE_SYNC_BUDGET_MS });
    logger.info({ mailboxId: m.id, historyId: notice.historyId, ...res }, 'gmail.push.synced');
  }
  return new NextResponse(null, { status: 204 });
}
