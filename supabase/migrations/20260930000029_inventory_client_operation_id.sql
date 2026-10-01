-- Idempotent inventory create: the client generates one client_operation_id per "Add item"
-- modal session and re-sends it on every retry/double-submit, so the server can return the
-- already-created row instead of inserting a duplicate.
--
-- Nullable on purpose: existing rows (and any caller that doesn't send one) keep NULL, and
-- NULLs are distinct under a UNIQUE constraint, so no existing data is touched or conflicts.
-- Deliberately NOT adding UNIQUE (workspace_id, sku): workspace 1f061259 already holds 12
-- rows with an identical SKU and tenant data is not being modified.
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS client_operation_id uuid;

ALTER TABLE public.inventory_items
  ADD CONSTRAINT inventory_items_workspace_client_operation_key
  UNIQUE (workspace_id, client_operation_id);
