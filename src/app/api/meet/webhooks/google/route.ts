import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

// Constant-time comparison — same standing rule as every other signature/token check in this
// codebase (see webhooks/meta, lib/calendar/payfast). A plain `!==`/`===` leaks timing
// information proportional to the number of matching leading bytes.
function tokensMatch(provided: string | null, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const resourceId = req.headers.get('x-goog-resource-id');

    logger.info({ channelId, resourceState }, 'google_webhook.push_notification.received');

    // If it's a sync confirmation message, we just return OK
    if (resourceState === 'sync') {
      return new NextResponse('OK', { status: 200 });
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel id' }, { status: 400 });
    }

    // Real Google push notifications never carry a user session cookie, so this must be the
    // service-role client — the RLS-respecting client used here previously meant every query
    // below was silently filtered to nothing for genuine webhook calls.
    const supabase = createAdminClient();

    // Find the calendar connection associated with this channel ID
    // We assume the channel ID is stored in the connection's credentials/metadata
    const { data: connection } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('credentials->>google_channel_id', channelId)
      .maybeSingle();

    if (!connection) {
      logger.warn({ channelId }, 'google_webhook.connection.not_found');
      // return 200 anyway so Google doesn't retry indefinitely
      return new NextResponse('OK', { status: 200 });
    }

    // Google's push notification API has no request signature — the only integrity check it
    // offers is echoing back the `token` value supplied when the watch channel was registered
    // (channels.watch). Verify it against the value stored for this specific connection at
    // registration time; without this, anyone who learns/guesses a channelId could inject fake
    // sync events for that connection.
    const channelToken = req.headers.get('x-goog-channel-token');
    const expectedToken = (connection.credentials as any)?.google_channel_token;
    if (!tokensMatch(channelToken, expectedToken)) {
      logger.warn({ channelId }, 'google_webhook.channel_token.invalid');
      return new NextResponse('OK', { status: 200 });
    }

    // Log the sync event to meet_audit_trails
    await supabase
      .from('meet_audit_trails')
      .insert({
        workspace_id: connection.workspace_id,
        actor_id: connection.user_id,
        action: 'update',
        entity_type: 'connection',
        entity_id: connection.id,
        new_state: {
          event: 'webhook_inbound_sync',
          provider: 'google',
          resource_id: resourceId,
        },
      });

    // Update connection's last_sync_at
    await supabase
      .from('user_calendar_connections')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", connection.id).eq("workspace_id", connection.workspace_id);

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error({ err: error }, 'google_webhook.parsing.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
