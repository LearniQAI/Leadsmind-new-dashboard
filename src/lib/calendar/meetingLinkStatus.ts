// Client-safe (no server imports): the meeting-link status vocabulary +
// its human-readable messaging, shared by the server resolver
// (lib/calendar/meetingLink.ts), the notification emails, and the
// appointment detail UI. Task 63.

export type MeetingLinkStatus =
  | 'internal'
  | 'custom'
  | 'google_meet'
  | 'google_meet_pending_connection'
  | 'google_meet_unavailable'
  | 'zoom_pending_integration'
  | 'none';

/**
 * One-liner explaining a meeting-link status for confirmation emails and the
 * appointment detail view. Returns null when the link (or its absence) speaks
 * for itself and no explanation is needed.
 */
export function meetingLinkNote(status: MeetingLinkStatus, audience: 'booker' | 'host'): string | null {
  switch (status) {
    case 'zoom_pending_integration':
      return audience === 'host'
        ? 'This calendar is set to Zoom, but Zoom integration is not available yet. Send the Zoom link to the attendee manually.'
        : 'Zoom integration is coming soon — your host will send you the meeting link separately before the meeting.';
    case 'google_meet_pending_connection':
      return audience === 'host'
        ? 'A LeadsMind video room was set up for this meeting. Connect your Google Calendar (Settings → Integrations) to auto-generate Google Meet links for future bookings.'
        : null;
    case 'google_meet_unavailable':
      return audience === 'host'
        ? "Google Meet couldn't be reached for this booking, so a LeadsMind video room is being used instead. The link below works."
        : null;
    default:
      return null;
  }
}
