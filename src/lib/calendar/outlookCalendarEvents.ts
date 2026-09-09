import { getCalendarConnection, getFreshCalendarAccessToken } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';
import type { CalendarEventSyncResult } from '@/lib/calendar/googleMeet';

// Outlook / Microsoft 365 calendar *event* update + delete — the exact mirror
// of googleMeet.ts's updateGoogleCalendarEventTime / deleteGoogleCalendarEvent,
// using the identical getCalendarConnection('outlook') + getFreshCalendarAccessToken
// model (no parallel Graph auth pattern). Same best-effort contract: never
// throws, returns 'updated' | 'not_applicable' | 'failed'.
//
// Outlook events are created by lib/calendar/calendarSync.ts:syncBookingToExternal
// (public / client-portal bookings), which stores the event id on
// appointments.metadata.outlook_event_id.

const EVENTS_BASE = 'https://graph.microsoft.com/v1.0/me/events';

async function hostToken(hostUserId: string | null): Promise<string | null> {
  if (!hostUserId) return null;
  const connection = await getCalendarConnection(hostUserId, 'outlook');
  if (!connection) return null;
  return getFreshCalendarAccessToken(connection);
}

export async function updateOutlookCalendarEventTime(
  hostUserId: string | null,
  eventId: string | null,
  times: { startIso: string; endIso: string }
): Promise<CalendarEventSyncResult> {
  if (!eventId || !hostUserId) return 'not_applicable';
  try {
    const token = await hostToken(hostUserId);
    // An event exists but the connection is gone — a signal-worthy failure.
    if (!token) return 'failed';

    const res = await fetch(`${EVENTS_BASE}/${encodeURIComponent(eventId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start: { dateTime: times.startIso, timeZone: 'UTC' },
        end: { dateTime: times.endIso, timeZone: 'UTC' },
      }),
    });

    if (res.status === 404 || res.status === 410) return 'not_applicable';
    if (!res.ok) {
      logger.warn({ status: res.status, eventId }, 'calendar.outlook_event.time_update.failed');
      return 'failed';
    }
    return 'updated';
  } catch (err) {
    logger.warn({ err, eventId }, 'calendar.outlook_event.time_update.error');
    return 'failed';
  }
}

export async function deleteOutlookCalendarEvent(
  hostUserId: string | null,
  eventId: string | null
): Promise<CalendarEventSyncResult> {
  if (!eventId || !hostUserId) return 'not_applicable';
  try {
    const token = await hostToken(hostUserId);
    // An event exists but the connection is gone — a signal-worthy failure.
    if (!token) return 'failed';

    const res = await fetch(`${EVENTS_BASE}/${encodeURIComponent(eventId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok || res.status === 404 || res.status === 410) return 'updated';
    logger.warn({ status: res.status, eventId }, 'calendar.outlook_event.delete.failed');
    return 'failed';
  } catch (err) {
    logger.warn({ err, eventId }, 'calendar.outlook_event.delete.error');
    return 'failed';
  }
}
