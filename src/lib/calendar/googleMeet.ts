import { requireWorkspaceAccess } from '@/lib/auth';
import { getCalendarConnection, getFreshCalendarAccessToken } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

// Creates a real Google Meet link by inserting a Calendar event with
// conferenceData, using the acting user's connected Google Calendar
// (user_calendar_connections, provider 'google' — Task 62 single source of
// truth; previously read platform_connections 'google_calendar', a row that
// could never exist because that table's platform CHECK rejects the value).
//
// Returns null on ANY failure (no connection, refresh failed, API error) so
// callers fall back to the internal /meet/[id] room — an internal_meet
// booking must never hard-fail because Google is unavailable.
export async function createGoogleMeetLink(appointmentDetails: {
  title: string;
  start_time: string;
  end_time: string;
}): Promise<string | null> {
  try {
    const { userId } = await requireWorkspaceAccess();

    const connection = await getCalendarConnection(userId, 'google');
    if (!connection) return null;

    const accessToken = await getFreshCalendarAccessToken(connection);

    const eventResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: appointmentDetails.title,
          start: { dateTime: appointmentDetails.start_time },
          end: { dateTime: appointmentDetails.end_time },
          conferenceData: {
            createRequest: {
              requestId: `leadsmind-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      }
    );

    if (!eventResponse.ok) {
      logger.warn(
        { status: eventResponse.status },
        'calendar.google_meet.event_create.failed'
      );
      return null;
    }

    const event = await eventResponse.json();
    const entryPoints = event.conferenceData?.entryPoints;
    if (Array.isArray(entryPoints)) {
      const videoLink = entryPoints.find((ep: any) => ep.entryPointType === 'video');
      return videoLink?.uri ?? null;
    }
    return null;
  } catch (err) {
    logger.warn({ err }, 'calendar.google_meet.link_create.failed');
    return null;
  }
}
