import { getCalendarConnection, getFreshCalendarAccessToken } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';
import type { CalendarEventSyncResult } from '@/lib/calendar/googleMeet';

// Task 70 — real Zoom meeting operations for the booking module, on the host's
// connected Zoom account (user_calendar_connections, provider 'zoom'). Exact
// mirror of googleMeet.ts: same getCalendarConnection + getFreshCalendarAccessToken
// model (no parallel auth), same best-effort contract — a booking must NEVER
// hard-fail because Zoom is unavailable; the caller falls back to /meet/[id].
//
//   - createZoomMeeting        : POST /users/me/meetings -> join_url + meeting id
//   - updateZoomMeetingTime    : PATCH /meetings/{id}   (reschedule)
//   - deleteZoomMeeting        : DELETE /meetings/{id}   (cancellation)
//
// Zoom Marketplace app (User-managed OAuth) + ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET
// env vars are required before this does anything real — until then
// getCalendarConnection('zoom') returns null and meetingLink.ts falls back.

const API_BASE = 'https://api.zoom.us/v2';

async function resolveHostAccessToken(hostUserId: string | null | undefined): Promise<string | null> {
  if (!hostUserId) return null;
  const connection = await getCalendarConnection(hostUserId, 'zoom');
  if (!connection) return null;
  return getFreshCalendarAccessToken(connection);
}

export interface CreatedZoomMeeting {
  link: string | null;
  meetingId: string | null;
}

function durationMinutes(startIso: string, endIso: string): number {
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
  return mins > 0 ? mins : 30;
}

/**
 * Creates a real Zoom meeting on the host's account. Returns the join URL AND
 * the meeting id (needed to PATCH/DELETE the same meeting on reschedule/cancel).
 * Returns nulls on ANY failure.
 */
export async function createZoomMeeting(
  details: { title: string; start_time: string; end_time: string },
  hostUserId?: string
): Promise<CreatedZoomMeeting> {
  try {
    const accessToken = await resolveHostAccessToken(hostUserId);
    if (!accessToken) return { link: null, meetingId: null };

    const res = await fetch(`${API_BASE}/users/me/meetings`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: details.title,
        type: 2, // scheduled meeting
        start_time: new Date(details.start_time).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        duration: durationMinutes(details.start_time, details.end_time),
        timezone: 'UTC',
        settings: { join_before_host: true, waiting_room: false },
      }),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, 'calendar.zoom.meeting_create.failed');
      return { link: null, meetingId: null };
    }

    const meeting = await res.json();
    return {
      link: meeting.join_url ?? null,
      meetingId: meeting.id != null ? String(meeting.id) : null,
    };
  } catch (err) {
    logger.warn({ err }, 'calendar.zoom.meeting_create.error');
    return { link: null, meetingId: null };
  }
}

/**
 * PATCHes an existing Zoom meeting's start time + duration on reschedule.
 * Same best-effort contract as updateGoogleCalendarEventTime.
 *   'updated'        — Zoom accepted the change (HTTP 204)
 *   'not_applicable' — no meeting id / no connection, or the meeting is already gone
 *   'failed'         — a connection existed but Zoom rejected the call
 */
export async function updateZoomMeetingTime(
  hostUserId: string | null,
  meetingId: string | null,
  times: { startIso: string; endIso: string }
): Promise<CalendarEventSyncResult> {
  if (!meetingId || !hostUserId) return 'not_applicable';
  try {
    const accessToken = await resolveHostAccessToken(hostUserId);
    if (!accessToken) return 'failed';

    const res = await fetch(`${API_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        start_time: new Date(times.startIso).toISOString().replace(/\.\d{3}Z$/, 'Z'),
        duration: durationMinutes(times.startIso, times.endIso),
        timezone: 'UTC',
      }),
    });

    if (res.status === 404) return 'not_applicable';
    if (!res.ok && res.status !== 204) {
      logger.warn({ status: res.status, meetingId }, 'calendar.zoom.meeting_time_update.failed');
      return 'failed';
    }
    return 'updated';
  } catch (err) {
    logger.warn({ err, meetingId }, 'calendar.zoom.meeting_time_update.error');
    return 'failed';
  }
}

/** DELETEs an existing Zoom meeting on cancellation. A 404 (already gone) counts as done. */
export async function deleteZoomMeeting(
  hostUserId: string | null,
  meetingId: string | null
): Promise<CalendarEventSyncResult> {
  if (!meetingId || !hostUserId) return 'not_applicable';
  try {
    const accessToken = await resolveHostAccessToken(hostUserId);
    if (!accessToken) return 'failed';

    const res = await fetch(`${API_BASE}/meetings/${encodeURIComponent(meetingId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.ok || res.status === 204 || res.status === 404) return 'updated';
    logger.warn({ status: res.status, meetingId }, 'calendar.zoom.meeting_delete.failed');
    return 'failed';
  } catch (err) {
    logger.warn({ err, meetingId }, 'calendar.zoom.meeting_delete.error');
    return 'failed';
  }
}
