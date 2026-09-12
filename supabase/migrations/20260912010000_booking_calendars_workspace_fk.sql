-- Fix: `booking_calendars.workspace_id` has never had a real foreign key to
-- `workspaces(id)` since the table was created (phase17_calendar_booking_repair).
-- Every other workspace-scoped table in this schema (round_robin_assignment,
-- service_items, the meet_* tables, etc.) has this FK; booking_calendars was
-- missed.
--
-- Real-world impact confirmed live: getPublicCalendarBySlug() (the public
-- /book/[slug] page's data source) does a PostgREST embedded-resource select
-- `workspace:workspaces(name, slug, logo_url)`. PostgREST resolves embeds via
-- actual FK constraints — with none present, EVERY call fails with
-- PGRST200 ("Could not find a relationship between 'booking_calendars' and
-- 'workspaces' in the schema cache"), so the function returns null for every
-- slug and every public booking page 404s, regardless of whether the
-- calendar/slug is real. This is the actual root cause behind "View public
-- pages" appearing to link to a nonexistent page — the destination slug was
-- correct, the lookup underneath it was silently failing for ALL calendars.
--
-- Confirmed zero orphaned workspace_id values before adding this (verified
-- live against the current data) so the constraint add is safe.
ALTER TABLE public.booking_calendars
  ADD CONSTRAINT booking_calendars_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_booking_calendars_workspace_id ON public.booking_calendars(workspace_id);
