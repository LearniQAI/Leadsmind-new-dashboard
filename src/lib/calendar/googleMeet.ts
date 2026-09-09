import { getCalendarConnection, getFreshCalendarAccessToken } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';

// All Google Calendar *event* operations for the booking module, on the host's
// connected calendar (user_calendar_connections, provider 'google' — Task 62
// single source of truth). Every function here uses the exact same
// getCalendarConnection + getFreshCalendarAccessToken model — no parallel
// Google API auth pattern anywhere.
//
// - createGoogleMeetLink : POST an event with conferenceData -> Meet link + event id
// - updateGoogleCalendarEventTime : PATCH an existing event's start/end (reschedule)
// - deleteGoogleCalendarEvent : DELETE an existing event (cancellation)

const EVENTS_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

async function resolveHostAccessToken(hostUserId: string | undefined): Promise<string | null> {
  let userId = hostUserId;
  if (!userId) {
    // Only the internal instant-meeting path omits hostUserId. Import auth
    // lazily so booking flows (which always pass an explicit host) don't pull
    // the request-scoped auth module into their code path.
    const { requireWorkspaceAccess } = await import('@/lib/auth');
    userId = (await requireWorkspaceAccess()).userId;
  }
  const connection = await getCalendarConnection(userId, 'google');
  if (!connection) return null;
  return getFreshCalendarAccessToken(connection);
}

export interface CreatedGoogleMeetEvent {
  link: string | null;
  eventId: string | null;
}

/**
 * Creates a Google Calendar event with a Meet conference. Returns the video
 * link AND the event id (needed to patch/delete the same event on
 * reschedule/cancel). Returns nulls on ANY failure — a booking must never
 * hard-fail because Google is unavailable; the caller falls back to the
 * internal /meet/[id] room.
 */
export async function createGoogleMeetLink(
  appointmentDetails: { title: string; start_time: string; end_time: string },
  hostUserId?: string
): Promise<CreatedGoogleMeetEvent> {
  try {
    const accessToken = await resolveHostAccessToken(hostUserId);
    if (!accessToken) return { link: null, eventId: null };

    const eventResponse = await fetch(`${EVENTS_BASE}?conferenceDataVersion=1`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
    });

    if (!eventResponse.ok) {
      logger.warn({ status: eventResponse.status }, 'calendar.google_meet.event_create.failed');
      return { link: null, eventId: null };
    }

    const event = await eventResponse.json();
    const entryPoints = event.conferenceData?.entryPoints;
    const videoLink = Array.isArray(entryPoints)
      ? entryPoints.find((ep: any) => ep.entryPointType === 'video')?.uri ?? null
      : null;
    return { link: videoLink, eventId: event.id ?? null };
  } catch (err) {
    logger.warn({ err }, 'calendar.google_meet.link_create.failed');
    return { link: null, eventId: null };
  }
}

export type CalendarEventSyncResult = 'updated' | 'not_applicable' | 'failed';

/**
 * PATCHes an existing Google Calendar event's start/end time — used when a
 * booking is rescheduled so the host's real calendar reflects the new time
 * instead of silently keeping the old one. Best-effort:
 *   'updated'        — the event's time was changed on Google
 *   'not_applicable' — no event id / no connection (nothing to do)
 *   'failed'         — a connection existed but Google rejected the call
 *                      (e.g. token revoked, event deleted on Google's side)
 * Never throws — the caller's own reschedule must still succeed.
 */
export async function updateGoogleCalendarEventTime(
  hostUserId: string | null,
  eventId: string | null,
  times: { startIso: string; endIso: string }
): Promise<CalendarEventSyncResult> {
  if (!eventId || !hostUserId) return 'not_applicable';
  try {
    const accessToken = await resolveHostAccessToken(hostUserId);
    // There IS an event to update but the host's calendar connection is gone
    // (revoked / errored) — that's a real, signal-worthy failure, not a no-op.
    if (!accessToken) return 'failed';

    const res = await fetch(`${EVENTS_BASE}/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { dateTime: times.startIso },
        end: { dateTime: times.endIso },
      }),
    });

    // 404/410 => the event is already gone on Google's side; nothing more to do.
    if (res.status === 404 || res.status === 410) return 'not_applicable';
    if (!res.ok) {
      logger.warn({ status: res.status, eventId }, 'calendar.google_event.time_update.failed');
      return 'failed';
    }
    return 'updated';
  } catch (err) {
    logger.warn({ err, eventId }, 'calendar.google_event.time_update.error');
    return 'failed';
  }
}

/**
 * DELETEs an existing Google Calendar event — used when a booking is
 * cancelled so it doesn't silently remain on the host's calendar. Same
 * best-effort contract as updateGoogleCalendarEventTime. A 404/410 (already
 * gone) counts as success.
 */
export async function deleteGoogleCalendarEvent(
  hostUserId: string | null,
  eventId: string | null
): Promise<CalendarEventSyncResult> {
  if (!eventId || !hostUserId) return 'not_applicable';
  try {
    const accessToken = await resolveHostAccessToken(hostUserId);
    if (!accessToken) return 'failed';

    const res = await fetch(`${EVENTS_BASE}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok || res.status === 404 || res.status === 410) return 'updated';
    logger.warn({ status: res.status, eventId }, 'calendar.google_event.delete.failed');
    return 'failed';
  } catch (err) {
    logger.warn({ err, eventId }, 'calendar.google_event.delete.error');
    return 'failed';
  }
}
