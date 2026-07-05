import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Outlook Webhook Validation Challenge
    const validationToken = req.nextUrl.searchParams.get('validationToken');
    if (validationToken) {
      console.log('[outlook-webhook] Responding to subscription validation request.');
      return new NextResponse(validationToken, {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    const payload = await req.json();
    console.log('[outlook-webhook] Received notifications:', JSON.stringify(payload));

    const notifications = payload?.value || [];
    if (notifications.length === 0) {
      return new NextResponse('OK', { status: 200 });
    }

    const supabase = await createServerClient();

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
        console.warn(`[outlook-webhook] No connection found for subscription: ${subscriptionId}`);
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
    console.error('[outlook-webhook] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
