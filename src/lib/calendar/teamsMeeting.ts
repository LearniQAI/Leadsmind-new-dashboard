import { getCalendarConnection, getFreshCalendarAccessToken } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';
import type { CalendarEventSyncResult } from '@/lib/calendar/googleMeet';

// Task 70 — real Microsoft Teams online-meeting operations. This is a DIFFERENT
// Graph surface than the Outlook calendar events API (outlookCalendarEvents.ts):
// Graph /me/onlineMeetings, which needs the OnlineMeetings.ReadWrite delegated
// scope. It reuses the EXISTING Outlook connection from Task 62 (provider
// 'outlook') — no second Microsoft app/connection — with that one extra scope
// added to the OAuth flow (see MICROSOFT_CALENDAR_SCOPES in connections.ts).
//
//   - createTeamsMeeting     : POST /me/onlineMeetings   -> joinWebUrl + id
//   - updateTeamsMeetingTime : PATCH /me/onlineMeetings/{id}   (reschedule)
//   - deleteTeamsMeeting     : DELETE /me/onlineMeetings/{id}   (cancellation)
//
// Same best-effort contract as googleMeet.ts / zoomMeeting.ts: never throws, a
// booking never hard-fails because Graph is unavailable.

const ONLINE_MEETINGS_BASE = 'https://graph.microsoft.com/v1.0/me/onlineMeetings';

async function hostToken(hostUserId: string | null | undefined): Promise<string | null> {
  if (!hostUserId) return null;
  const connection = await getCalendarConnection(hostUserId, 'outlook');
  if (!connection) return null;
  return getFreshCalendarAccessToken(connection);
}

export interface CreatedTeamsMeeting {
  link: string | null;
  meetingId: string | null;
}

/**
 * Creates a real Teams online meeting on the host's Microsoft 365 account.
 * Returns the join URL AND the meeting id. Returns nulls on ANY failure — the
 * caller falls back to the internal /meet/[id] room.
 */
export async function createTeamsMeeting(
  details: { title: string; start_time: string; end_time: string },
  hostUserId?: string
): Promise<CreatedTeamsMeeting> {
  try {
    const token = await hostToken(hostUserId);
    if (!token) return { link: null, meetingId: null };

    const res = await fetch(ONLINE_MEETINGS_BASE, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDateTime: new Date(details.start_time).toISOString(),
        endDateTime: new Date(details.end_time).toISOString(),
        subject: details.title,
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'calendar.teams.meeting_create.failed');
      return { link: null, meetingId: null };
    }

    const meeting = await res.json();
    return { link: meeting.joinWebUrl ?? meeting.joinUrl ?? null, meetingId: meeting.id ?? null };
  } catch (err) {
    logger.warn({ err }, 'calendar.teams.meeting_create.error');
    return { link: null, meetingId: null };
  }
}

/**
 * PATCHes an existing Teams online meeting's start/end on reschedule. Same
 * best-effort contract as the Google/Zoom equivalents.
 */
export async function updateTeamsMeetingTime(
  hostUserId: string | null,
  meetingId: string | null,
  times: { startIso: string; endIso: string }
): Promise<CalendarEventSyncResult> {
  if (!meetingId || !hostUserId) return 'not_applicable';
  try {
    const token = await hostToken(hostUserId);
    if (!token) return 'failed';

    const res = await fetch(`${ONLINE_MEETINGS_BASE}/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDateTime: new Date(times.startIso).toISOString(),
        endDateTime: new Date(times.endIso).toISOString(),
      }),
    });

    if (res.status === 404) return 'not_applicable';
    if (!res.ok) {
      logger.warn({ status: res.status, meetingId }, 'calendar.teams.meeting_time_update.failed');
      return 'failed';
    }
    return 'updated';
  } catch (err) {
    logger.warn({ err, meetingId }, 'calendar.teams.meeting_time_update.error');
    return 'failed';
  }
}

/** DELETEs an existing Teams online meeting on cancellation. 404 counts as done. */
export async function deleteTeamsMeeting(
  hostUserId: string | null,
  meetingId: string | null
): Promise<CalendarEventSyncResult> {
  if (!meetingId || !hostUserId) return 'not_applicable';
  try {
    const token = await hostToken(hostUserId);
    if (!token) return 'failed';

    const res = await fetch(`${ONLINE_MEETINGS_BASE}/${encodeURIComponent(meetingId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok || res.status === 204 || res.status === 404) return 'updated';
    logger.warn({ status: res.status, meetingId }, 'calendar.teams.meeting_delete.failed');
    return 'failed';
  } catch (err) {
    logger.warn({ err, meetingId }, 'calendar.teams.meeting_delete.error');
    return 'failed';
  }
}
