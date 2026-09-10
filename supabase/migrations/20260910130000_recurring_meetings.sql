-- Task 69 — Recurring / repeating meetings.
--
-- Data model: OPTION B (materialised). One `recurring_series` row holds the
-- RFC-5545 RRULE (the source of truth) plus the settings every occurrence
-- shares; N real `appointments` rows (one per occurrence) are generated eagerly
-- at creation. This keeps EVERY calendar subsystem already built working with
-- zero changes — the reminder + AI-brief crons scan real rows, getAvailableSlots
-- / validateSlot scan real rows for conflicts, the appointments_no_overlap
-- EXCLUDE constraint guards real rows, all five calendar views render a flat
-- appointments array, analytics and the waitlist triggers read real rows. A
-- purely virtual/computed occurrence model would require rewriting all of them.
--
-- Bounded volume: a series is capped at 60 occurrences (see
-- lib/calendar/recurrence.ts MAX_OCCURRENCES) generated up-front, so no rolling
-- regeneration job is needed.
--
-- Exceptions: when one occurrence is edited/cancelled on its own, the child row
-- itself IS the exception — flagged is_exception, keeping original_start_time so
-- it stays traceable to the series. No separate exception table.
--
-- External sync: ONE native recurring event per series (Google/Outlook both
-- accept `recurrence: ["RRULE:…"]` on a single event insert, with one
-- conferenceData block → one shared Meet link for all instances, which is
-- exactly Google's own convention). The recurring event id lives on the series.

CREATE TABLE IF NOT EXISTS public.recurring_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  calendar_id UUID REFERENCES public.booking_calendars(id) ON DELETE SET NULL,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  meeting_mode TEXT,
  -- RFC-5545 recurrence rule value, WITHOUT the leading "RRULE:" prefix
  -- (e.g. "FREQ=WEEKLY;INTERVAL=1;COUNT=4").
  rrule TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  dtstart TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  -- One shared meeting link for the whole series (Google recurring-event convention).
  meeting_link TEXT,
  meeting_link_status TEXT,
  -- ONE native external recurring event for the whole series.
  google_recurring_event_id TEXT,
  outlook_recurring_event_id TEXT,
  external_host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',        -- active | cancelled
  occurrence_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.recurring_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for recurring_series" ON public.recurring_series;
CREATE POLICY "Workspace access for recurring_series" ON public.recurring_series
  FOR ALL USING (check_workspace_access(workspace_id));

CREATE INDEX IF NOT EXISTS idx_recurring_series_workspace ON public.recurring_series(workspace_id);
CREATE INDEX IF NOT EXISTS idx_recurring_series_calendar ON public.recurring_series(calendar_id);

-- Link each generated occurrence back to its series. ON DELETE SET NULL: hard-
-- deleting a series must never cascade-delete real appointment history.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS series_id UUID REFERENCES public.recurring_series(id) ON DELETE SET NULL;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_exception BOOLEAN DEFAULT false;
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS original_start_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_appointments_series ON public.appointments(series_id);
