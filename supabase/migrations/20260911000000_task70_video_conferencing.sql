-- Task 70 — real Zoom + Microsoft Teams video-conferencing integration.
--
-- Google Meet is already real (Task 62 OAuth + Task 63 createGoogleMeetLink,
-- wired into meetingLink.ts). This migration unblocks the two remaining
-- providers so their branches in meetingLink.ts can persist real state:
--
--   1. Zoom  — a new `user_calendar_connections.provider` value. Zoom uses the
--      SAME per-user OAuth token store as Google/Outlook (encrypted at rest,
--      refreshed via getFreshCalendarAccessToken). It is a meeting provider,
--      not a calendar provider, so it never participates in busy-slot sync —
--      but the connection lifecycle (connect / refresh / disconnect / error)
--      is identical, so reusing the table avoids a parallel connection system.
--
--   2. Teams — NOT a new connection. Microsoft Teams online meetings are
--      created through Microsoft Graph's /me/onlineMeetings API on the SAME
--      Outlook (provider='outlook') connection from Task 62, with one extra
--      delegated scope (OnlineMeetings.ReadWrite) added to that OAuth flow.
--      What's needed here is only a new *meeting_mode* value so a booking
--      calendar can be set to "Teams".

-- 1. Zoom as a connection provider.
ALTER TABLE public.user_calendar_connections
  DROP CONSTRAINT IF EXISTS user_calendar_connections_provider_check;
ALTER TABLE public.user_calendar_connections
  ADD CONSTRAINT user_calendar_connections_provider_check
  CHECK (provider IN ('google', 'outlook', 'zoom'));

COMMENT ON TABLE public.user_calendar_connections IS
  'Single source of truth for calendar-provider OAuth (Google Calendar, Outlook/M365) AND the Zoom meeting connection (Task 70). Per-user. Written by /api/auth/google-calendar/*, /api/auth/microsoft/*, /api/auth/zoom/*. Read by lib/calendar/{calendarSync,googleMeet,zoomMeeting,teamsMeeting}.ts and /api/meet/webhooks/{google,outlook}. Zoom rows never participate in busy-slot sync.';

-- 2. 'teams' as a real meeting mode (Graph online meetings on the Outlook connection).
ALTER TABLE public.booking_calendars
  DROP CONSTRAINT IF EXISTS booking_calendars_meeting_mode_check;
ALTER TABLE public.booking_calendars
  ADD CONSTRAINT booking_calendars_meeting_mode_check
  CHECK (meeting_mode IN ('google_meet', 'zoom', 'teams', 'phone', 'in_person', 'custom_link', 'client_choice', 'internal_meet'));

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_meeting_mode_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_meeting_mode_check
  CHECK (meeting_mode IN ('google_meet', 'zoom', 'teams', 'phone', 'in_person', 'custom_link', 'client_choice', 'internal_meet'));
