-- Idempotent invoice creation: the invoice form re-sends one client_operation_id for every Retry /
-- double-click of the same Save, so a retry after a lost response returns the invoice that was
-- already created instead of creating a second one.
--
-- Nullable: existing invoices and every other creation path (webhooks, automations, checkout)
-- keep NULL; NULLs are distinct under UNIQUE.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS client_operation_id uuid;

ALTER TABLE public.invoices
  ADD CONSTRAINT invoices_workspace_client_operation_key
  UNIQUE (workspace_id, client_operation_id);
