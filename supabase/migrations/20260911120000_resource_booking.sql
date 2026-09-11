-- Task 71 — Workspace resource booking (meeting rooms, desks, equipment).
--
-- Step 1 scope decision (see docs/calendar-task71-resource-booking.md for the
-- full reasoning): the only trace of this feature before now was a
-- commented-out scaffold in scheduling.ts (`diagnoseSlotUnavailable`,
-- `// (Task 71)`) sketching an app-level overlap SELECT against a
-- `resource_id` column — a note-to-self, not something built on top of.
--
-- SCOPE A — resources attach to an appointment for that appointment's exact
-- time slot (a room/desk/equipment reserved alongside a meeting), mirroring
-- the person-double-booking model this module already has. Every existing
-- "reservation" concept here (appointments, waitlists, round-robin) exists to
-- serve a meeting; there is no independent day-based "hot-desking" surface
-- anywhere in the app to justify a second, unrelated booking UI. That
-- (SCOPE B) is deliberately deferred — see the report.
--
-- Conflict prevention reuses the EXACT mechanism appointments_no_overlap
-- already proved for calendar_id (20260717000000_calendar_double_booking_defense.sql):
-- a GiST EXCLUDE constraint over (key, time range) — a real DB-level
-- guarantee, not an app-level SELECT-then-INSERT race. Only 'scheduled'
-- appointments participate, so cancelling an appointment (or the resource
-- simply never having been assigned) frees the resource for that time with
-- no extra code — the same behaviour appointments_no_overlap already gives
-- calendar_id.
--
-- Availability windows: resources do NOT get their own business-hours model
-- (Step 1.4). A resource is only ever booked to match an appointment's start/
-- end time, and that appointment's own calendar has already passed its own
-- availability check before this constraint is ever tested — a second,
-- independent "room open 9-5" schedule would duplicate that check for no
-- real behavioural gain at this scope. If room-specific hours are needed
-- later, `resources` has room to grow (see the `metadata` column).

CREATE TABLE IF NOT EXISTS public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('room', 'desk', 'equipment')),
  location TEXT,
  capacity INTEGER,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.resources IS
  'Bookable physical/shared inventory (meeting rooms, desks, equipment). Reserved by attaching resource_id to an appointments row for that appointment''s exact time slot — see appointments_resource_no_overlap. Task 71.';

CREATE INDEX IF NOT EXISTS idx_resources_workspace ON public.resources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_resources_workspace_type ON public.resources(workspace_id, type);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace access for resources" ON public.resources;
CREATE POLICY "Workspace access for resources" ON public.resources
  FOR ALL USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

-- One optional resource per appointment. NULL = no resource requested — those
-- rows are exempt from the exclusion constraint below (WHERE resource_id IS
-- NOT NULL), same shape as appointments_no_overlap's own calendar_id guard.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS resource_id UUID REFERENCES public.resources(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_resource ON public.appointments(resource_id);

-- The real double-booking guarantee: the DB rejects ANY overlapping insert or
-- update for the same resource, regardless of which application code path
-- (or a future one) attempts it — identical mechanism to appointments_no_overlap,
-- targeting resource_id instead of calendar_id. btree_gist is already enabled
-- (20260717000000_calendar_double_booking_defense.sql).
ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_resource_no_overlap;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_resource_no_overlap
  EXCLUDE USING gist (
    resource_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status = 'scheduled' AND resource_id IS NOT NULL);
