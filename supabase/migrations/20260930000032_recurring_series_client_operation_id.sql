-- Idempotent recurring booking: the booking dialog re-sends one client_operation_id for every retry /
-- double-submit of the same "Confirm", so the server returns the series it already created instead of
-- creating a second series (and a second full set of occurrences).
--
-- Nullable: existing series and callers that send none keep NULL; NULLs are distinct under UNIQUE.
ALTER TABLE public.recurring_series
  ADD COLUMN IF NOT EXISTS client_operation_id uuid;

ALTER TABLE public.recurring_series
  ADD CONSTRAINT recurring_series_workspace_client_operation_key
  UNIQUE (workspace_id, client_operation_id);
