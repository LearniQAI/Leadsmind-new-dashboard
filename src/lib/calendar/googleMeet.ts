import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';

export async function createGoogleMeetLink(appointmentDetails: {
  title: string;
  start_time: string;
  end_time: string;
}): Promise<string | null> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: connection } = await supabase
      .from('platform_connections')
      .select('credentials')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'google_calendar')
      .single();

    if (!connection || !connection.credentials?.refresh_token) return null;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: connection.credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.access_token) throw new Error('Failed to refresh token');

    const eventResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        summary: appointmentDetails.title,
        start: { dateTime: appointmentDetails.start_time },
        end: { dateTime: appointmentDetails.end_time },
        conferenceData: {
          createRequest: {
            requestId: `leadsmind-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" }
          }
        }
      }),
    });

    const event = await eventResponse.json();
    if (event.conferenceData?.entryPoints) {
      const videoLink = event.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video');
      return videoLink ? videoLink.uri : null;
    }
    return null;
  } catch (err) {
    return null;
  }
}
