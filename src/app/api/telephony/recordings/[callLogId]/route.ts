import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { resolveWorkspaceTwilioCredentials, type WorkspaceTwilioRow } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Authenticated proxy for listening to a real voicemail/recording in-app. Twilio recording
// media requires HTTP Basic Auth with the OWNING account's SID/token to fetch — never exposed
// to the browser directly, so this route holds the workspace's real credentials server-side and
// streams the audio through, gated by the same admin/owner workspace-role check as every other
// telephony action.
export async function GET(req: NextRequest, { params }: { params: Promise<{ callLogId: string }> }) {
  const { callLogId } = await params;

  try {
    const { workspaceId } = await requireWorkspaceRole(['admin', 'owner']);
    const adminClient = createAdminClient();

    const { data: callLog } = await adminClient
      .from('call_logs')
      .select('recording_url, voicemail_url')
      .eq('id', callLogId)
      .eq('workspace_id', workspaceId)
      .single();

    const mediaUrl = callLog?.voicemail_url || callLog?.recording_url;
    if (!mediaUrl) return NextResponse.json({ error: 'No recording found.' }, { status: 404 });

    const { data: workspace } = await adminClient
      .from('workspaces')
      .select('twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted')
      .eq('id', workspaceId)
      .single<WorkspaceTwilioRow>();

    const { accountSid, authToken } = resolveWorkspaceTwilioCredentials(workspace);
    if (!accountSid || !authToken) return NextResponse.json({ error: 'Twilio not connected.' }, { status: 400 });

    const fetchUrl = mediaUrl.endsWith('.mp3') ? mediaUrl : `${mediaUrl}.mp3`;
    const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const twilioRes = await fetch(fetchUrl, { headers: { Authorization: `Basic ${basicAuth}` } });
    if (!twilioRes.ok || !twilioRes.body) {
      logger.warn({ callLogId, status: twilioRes.status }, 'ivr.recording_proxy.fetch_failed');
      return NextResponse.json({ error: 'Could not fetch recording from Twilio.' }, { status: 502 });
    }

    return new NextResponse(twilioRes.body, {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (err: any) {
    logger.error({ err, callLogId }, 'ivr.recording_proxy.failed');
    return NextResponse.json({ error: 'Failed to load recording.' }, { status: 500 });
  }
}
