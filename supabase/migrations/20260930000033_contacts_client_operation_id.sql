-- Idempotent client creation from the invoice/quote "New client" modal: one client_operation_id per
-- modal open, re-sent on every retry/double-submit, so the server returns the contact it already
-- created instead of inserting a duplicate (or failing on the (workspace_id, email) unique key).
--
-- Nullable: every existing contact and every other creation path (CRM form, import, forms, API)
-- keeps NULL; NULLs are distinct under UNIQUE so nothing conflicts and no existing data changes.
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS client_operation_id uuid;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_workspace_client_operation_key
  UNIQUE (workspace_id, client_operation_id);
