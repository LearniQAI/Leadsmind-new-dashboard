-- Idempotent staff booking: the booking dialog generates one client_operation_id per dialog
-- open and re-sends it on every retry/double-submit, so the server returns the already-created
-- appointment instead of inserting a second one.
--
-- Nullable: existing rows and callers that don't send one (public booking, portal, instant
-- meet, recurring series) keep NULL; NULLs are distinct under UNIQUE so nothing conflicts.
-- Slot double-booking is already enforced in the DB by appointments_no_overlap (EXCLUDE on
-- calendar_id + tstzrange for status='scheduled'); this migration does not touch it.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS client_operation_id uuid;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_workspace_client_operation_key
  UNIQUE (workspace_id, client_operation_id);
