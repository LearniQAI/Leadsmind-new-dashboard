-- Add 'webinar' as a real, first-class booking-calendar type — a peer of
-- 'class_booking', not a rename of it. Both share the exact same underlying
-- group-session machinery (capacity cap, fn_secure_booking_or_waitlist,
-- per-attendee booking_waitlists records, waitlist offer/accept, video-
-- conferencing modes) — see docs/calendar-webinar-feature.md for the full
-- Step 1 audit + decision. This migration only widens the CHECK constraint;
-- no other schema change is needed because 'webinar' rows flow through the
-- identical capacity/max_attendees/current_attendee_count/waitlist_enabled
-- columns class_booking already uses.
--
-- Real constraint name confirmed live (not guessed) by triggering the
-- violation directly: "booking_calendars_calendar_type_check".
ALTER TABLE public.booking_calendars
  DROP CONSTRAINT IF EXISTS booking_calendars_calendar_type_check;
ALTER TABLE public.booking_calendars
  ADD CONSTRAINT booking_calendars_calendar_type_check
  CHECK (calendar_type IN ('personal', 'round_robin', 'collective', 'class_booking', 'service_menu', 'event', 'webinar'));
