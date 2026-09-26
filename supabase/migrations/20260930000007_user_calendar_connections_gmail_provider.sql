-- Gmail mailbox connection (Conversations, PRD Section A) as a provider in the existing per-user
-- OAuth store, instead of a new token table. Same encrypted-credentials shape, owner-only RLS
-- (20260930000006), refresh (getFreshCalendarAccessToken) and revoke lifecycle as Calendar/Zoom.
--
-- A SEPARATE row from the user's 'google' calendar row even though both use the same Google OAuth
-- client: disconnecting one must not remove the other, and Gmail's restricted scopes are consented
-- to independently. Like Zoom, Gmail rows never participate in calendar busy-slot or event sync
-- (calendarSync.ts filters to google/outlook).

ALTER TABLE public.user_calendar_connections
  DROP CONSTRAINT IF EXISTS user_calendar_connections_provider_check;
ALTER TABLE public.user_calendar_connections
  ADD CONSTRAINT user_calendar_connections_provider_check
  CHECK (provider IN ('google', 'outlook', 'zoom', 'gmail'));

COMMENT ON TABLE public.user_calendar_connections IS
  'Single source of truth for per-user provider OAuth: Google Calendar, Outlook/M365, the Zoom meeting connection (Task 70) and the Gmail mailbox connection (Conversations). Owner-only RLS. Written by /api/auth/{google-calendar,microsoft,zoom,gmail}/*. Read by lib/calendar/{calendarSync,googleMeet,zoomMeeting,teamsMeeting}.ts, lib/gmail/*, and /api/meet/webhooks/{google,outlook}. Zoom and Gmail rows never participate in busy-slot sync.';
