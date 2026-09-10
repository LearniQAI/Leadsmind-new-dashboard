import { createAdminClient } from '@/lib/supabase/server';
import { createGoogleMeetLink } from '@/lib/calendar/googleMeet';
import { createZoomMeeting } from '@/lib/calendar/zoomMeeting';
import { createTeamsMeeting } from '@/lib/calendar/teamsMeeting';
import { getCalendarConnection } from '@/lib/calendar/connections';
import { logger } from '@/shared/logger';
import type { MeetingLinkStatus } from '@/lib/calendar/meetingLinkStatus';

export { meetingLinkNote } from '@/lib/calendar/meetingLinkStatus';
export type { MeetingLinkStatus } from '@/lib/calendar/meetingLinkStatus';

// Task 63 — single, shared meeting-link resolver for EVERY booking-creation
// path (internal staff booking, public /book, client portal, PayFast webhook).
//
// Core rule: a booking must NEVER be persisted with a meeting_link that looks
// functional but isn't. Previously the internal path emitted random
// `https://meet.google.com/xxx-xxxx-xxx` and `https://zoom.us/j/<rand>` URLs;
// the other three paths silently left the link null with no explanation. Now:
//   - google_meet  -> a REAL Google Meet link (Task 62 OAuth), or a working
//                     LeadsMind room as an honest fallback when the host hasn't
//                     connected Google / the API fails
//   - zoom         -> null + an explicit "coming soon" status (real Zoom
//                     integration is Task 70), surfaced to booker + host
//   - internal_meet / custom_link -> unchanged, real
//   - phone / in_person -> no video link (unchanged)

export interface ResolvedMeetingLink {
  meetingLink: string | null;
  /** meeting_mode to persist — differs from the requested mode when we fall back */
  meetingMode: string;
  status: MeetingLinkStatus;
  /**
   * When a real Google Calendar event was created for this booking (google_meet
   * mode, host connected), its id + the host whose calendar it lives on — so a
   * later reschedule/cancel can PATCH/DELETE the SAME event instead of leaving
   * the host's calendar stale. Null for every other outcome.
   */
  googleCalendarEventId: string | null;
  calendarEventHostUserId: string | null;
  /**
   * Task 70 — the real Zoom meeting id / Teams online-meeting id created for
   * this booking, so reschedule/cancel can PATCH/DELETE the same meeting.
   * `calendarEventHostUserId` carries the host in these cases too.
   */
  zoomMeetingId?: string | null;
  teamsMeetingId?: string | null;
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function resolveHostUserId(workspaceId: string, appointmentHostUserId: string | null): Promise<string | null> {
  if (appointmentHostUserId) return appointmentHostUserId;
  const supabase = createAdminClient();
  const { data } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
  return data?.owner_id ?? null;
}

export async function resolveMeetingLink(params: {
  appointmentId: string;
  requestedMode: string;
  /** appointments.user_id (round-robin assignee); null falls back to the workspace owner */
  hostUserId: string | null;
  workspaceId: string;
  calendarCustomLink: string | null;
  title: string;
  startTime: string;
  endTime: string;
}): Promise<ResolvedMeetingLink> {
  const internalLink = `${appUrl()}/meet/${params.appointmentId}`;
  const mode = params.requestedMode || 'internal_meet';
  const noEvent = { googleCalendarEventId: null, calendarEventHostUserId: null };

  if (mode === 'phone' || mode === 'client_choice') {
    return { meetingLink: null, meetingMode: mode, status: 'none', ...noEvent };
  }

  if (mode === 'in_person') {
    // `location` is an address here, not a URL — keep whatever was configured
    // (matches the internal path's prior behaviour) but flag no video link.
    return { meetingLink: params.calendarCustomLink ?? null, meetingMode: 'in_person', status: 'none', ...noEvent };
  }

  if (mode === 'custom_link') {
    if (params.calendarCustomLink) {
      return { meetingLink: params.calendarCustomLink, meetingMode: 'custom_link', status: 'custom', ...noEvent };
    }
    return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'internal', ...noEvent };
  }

  if (mode === 'internal_meet') {
    return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'internal', ...noEvent };
  }

  if (mode === 'zoom') {
    // Task 70 — real Zoom meeting on the host's connected Zoom account, or an
    // honest LeadsMind-room fallback. NEVER a fabricated zoom.us URL.
    const hostUserId = await resolveHostUserId(params.workspaceId, params.hostUserId);
    if (hostUserId) {
      const connection = await getCalendarConnection(hostUserId, 'zoom');
      if (connection) {
        const { link, meetingId } = await createZoomMeeting(
          { title: params.title, start_time: params.startTime, end_time: params.endTime },
          hostUserId
        );
        if (link) {
          return {
            meetingLink: link,
            meetingMode: 'zoom',
            status: 'zoom',
            ...noEvent,
            zoomMeetingId: meetingId,
            teamsMeetingId: null,
            calendarEventHostUserId: meetingId ? hostUserId : null,
          };
        }
        logger.warn({ appointmentId: params.appointmentId }, 'calendar.meeting_link.zoom.fell_back_to_internal');
        return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'zoom_unavailable', ...noEvent };
      }
    }
    // Host hasn't connected Zoom — a real, expected pre-setup case. Working
    // LeadsMind room now, never a fake Zoom link, and record why so the host is nudged.
    return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'zoom_pending_connection', ...noEvent };
  }

  if (mode === 'teams') {
    // Task 70 — real Microsoft Teams online meeting via Graph /me/onlineMeetings
    // on the host's EXISTING Outlook connection (Task 62 + the OnlineMeetings
    // scope). Same honest-fallback contract as Zoom / Google Meet.
    const hostUserId = await resolveHostUserId(params.workspaceId, params.hostUserId);
    if (hostUserId) {
      const connection = await getCalendarConnection(hostUserId, 'outlook');
      if (connection) {
        const { link, meetingId } = await createTeamsMeeting(
          { title: params.title, start_time: params.startTime, end_time: params.endTime },
          hostUserId
        );
        if (link) {
          return {
            meetingLink: link,
            meetingMode: 'teams',
            status: 'teams',
            ...noEvent,
            teamsMeetingId: meetingId,
            zoomMeetingId: null,
            calendarEventHostUserId: meetingId ? hostUserId : null,
          };
        }
        logger.warn({ appointmentId: params.appointmentId }, 'calendar.meeting_link.teams.fell_back_to_internal');
        return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'teams_unavailable', ...noEvent };
      }
    }
    return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'teams_pending_connection', ...noEvent };
  }

  if (mode === 'google_meet') {
    const hostUserId = await resolveHostUserId(params.workspaceId, params.hostUserId);

    if (hostUserId) {
      const connection = await getCalendarConnection(hostUserId, 'google');
      if (connection) {
        const { link, eventId } = await createGoogleMeetLink(
          { title: params.title, start_time: params.startTime, end_time: params.endTime },
          hostUserId
        );
        if (link) {
          return {
            meetingLink: link,
            meetingMode: 'google_meet',
            status: 'google_meet',
            googleCalendarEventId: eventId,
            calendarEventHostUserId: eventId ? hostUserId : null,
          };
        }
        // Connected but the Meet API call failed — honest fallback to a real room.
        logger.warn(
          { appointmentId: params.appointmentId },
          'calendar.meeting_link.google_meet.fell_back_to_internal'
        );
        return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'google_meet_unavailable', ...noEvent };
      }
    }

    // Host hasn't connected Google Calendar yet (a real, expected Task 62
    // case). Give the booker a working LeadsMind room now — never a fake
    // Google link, never nothing — and record why so the host is nudged.
    return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'google_meet_pending_connection', ...noEvent };
  }

  // Unknown mode — a real room, never a fake link.
  return { meetingLink: internalLink, meetingMode: 'internal_meet', status: 'internal', ...noEvent };
}

/**
 * Merges a resolved meeting link into an appointment's `metadata` — the single
 * place the persisted keys are decided, so all four booking paths agree:
 *   meeting_link_status          — the outcome (for the honest booker/host copy)
 *   google_event_id              — set only when a real Google Calendar event
 *                                  exists, so reschedule/cancel can patch/delete it
 *   calendar_event_host_user_id  — whose connected calendar that event lives on
 */
export function applyResolvedMeetingLink(
  existingMetadata: Record<string, any> | null | undefined,
  resolved: ResolvedMeetingLink
): Record<string, any> {
  const meta: Record<string, any> = { ...(existingMetadata || {}), meeting_link_status: resolved.status };
  if (resolved.googleCalendarEventId) {
    meta.google_event_id = resolved.googleCalendarEventId;
    meta.calendar_event_host_user_id = resolved.calendarEventHostUserId;
  }
  if (resolved.zoomMeetingId) {
    meta.zoom_meeting_id = resolved.zoomMeetingId;
    meta.calendar_event_host_user_id = resolved.calendarEventHostUserId;
  }
  if (resolved.teamsMeetingId) {
    meta.teams_meeting_id = resolved.teamsMeetingId;
    meta.calendar_event_host_user_id = resolved.calendarEventHostUserId;
  }
  return meta;
}
