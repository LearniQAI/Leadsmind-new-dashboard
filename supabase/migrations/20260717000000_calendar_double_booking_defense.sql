-- Closes the calendar module's double-booking race condition at the only
-- layer that can actually guarantee it: the database. Every existing
-- booking-creation path (public booking page, client portal, internal
-- dashboard, and the public v1 REST API) does a SELECT-then-INSERT
-- availability check with no locking — two concurrent requests for the
-- same slot can both pass the check and both succeed the insert. No
-- UNIQUE or EXCLUDE constraint existed on `appointments` to catch this at
-- the DB layer.
--
-- An EXCLUDE constraint using a GiST index over (calendar_id, time range)
-- makes a genuinely overlapping insert impossible regardless of which
-- application code path (or future one) attempts it, independent of any
-- app-level race. Only 'scheduled' appointments participate — cancelled/
-- no-show appointments must not block the slot from being rebooked, and
-- rows with no calendar_id (ad-hoc appointments created outside the
-- booking-calendar flow) are exempt since there's no shared resource to
-- protect. Per-host buffer time remains an application-level concern
-- (it's dynamic per host/profile, not a fixed schema property) — this
-- constraint only guarantees no two scheduled appointments on the same
-- calendar can occupy the exact same instant.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    calendar_id WITH =,
    tstzrange(start_time, end_time) WITH &&
  )
  WHERE (status = 'scheduled' AND calendar_id IS NOT NULL);
