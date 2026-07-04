import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const resourceId = req.headers.get('x-goog-resource-id');

    console.log(`[google-webhook] Received push notification. Channel: ${channelId}, State: ${resourceState}`);

    // If it's a sync confirmation message, we just return OK
    if (resourceState === 'sync') {
      return new NextResponse('OK', { status: 200 });
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel id' }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Find the calendar connection associated with this channel ID
    // We assume the channel ID is stored in the connection's credentials/metadata
    const { data: connection } = await supabase
      .from('user_calendar_connections')
      .select('*')
      .eq('credentials->>google_channel_id', channelId)
      .maybeSingle();

    if (!connection) {
      console.warn(`[google-webhook] No connection matching channel ID ${channelId}`);
      // return 200 anyway so Google doesn't retry indefinitely
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
    console.error('[google-webhook] Webhook parsing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
