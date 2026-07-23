import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Constant-time comparison — same standing rule as every other signature/token check in this
// codebase (see webhooks/meta, lib/calendar/payfast). A plain `!==`/`===` leaks timing
// information proportional to the number of matching leading bytes.
function tokensMatch(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false;
  const providedBuf = Buffer.from(provided, 'utf8');
  const expectedBuf = Buffer.from(expected, 'utf8');
  if (providedBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Outlook Webhook Validation Challenge
    const validationToken = req.nextUrl.searchParams.get('validationToken');
    if (validationToken) {
      logger.info({}, 'outlook_webhook.validation.responding');
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const payload = await req.json();
    logger.info({ payload }, 'outlook_webhook.notifications.received');

    const notifications = payload?.value || [];
    if (notifications.length === 0) {
      return new NextResponse('OK', { status: 200 });
    }

    // Real Microsoft Graph notifications never carry a user session cookie, so this must be
    // the service-role client — the RLS-respecting client used here previously meant every
    // query below was silently filtered to nothing for genuine webhook calls.
    const supabase = createAdminClient();

    for (const notification of notifications) {
      const subscriptionId = notification.subscriptionId;
      if (!subscriptionId) continue;

      // Find connection associated with subscription ID
      const { data: connection } = await supabase
        .from('user_calendar_connections')
        .select('*')
        .eq('credentials->>outlook_subscription_id', subscriptionId)
        .maybeSingle();

      if (!connection) {
        logger.warn({ subscriptionId }, 'outlook_webhook.connection.not_found');
        continue;
      }

      // Microsoft Graph has no request signature — `clientState` is the integrity check it
      // offers, an opaque value you supply when creating the subscription and that Graph
      // echoes back on every notification. Verify it against the value stored for this
      // specific connection at subscription-creation time.
      const expectedClientState = (connection.credentials as any)?.outlook_client_state;
      if (!tokensMatch(notification.clientState, expectedClientState)) {
        logger.warn({ subscriptionId }, 'outlook_webhook.client_state.invalid');
        continue;
      }

      // Log sync event
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
            provider: 'outlook',
            subscription_id: subscriptionId,
            change_type: notification.changeType,
          },
        });

      // Update sync timestamp
      await supabase
        .from('user_calendar_connections')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", connection.id).eq("workspace_id", connection.workspace_id);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    logger.error({ err: error }, 'outlook_webhook.failed');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
