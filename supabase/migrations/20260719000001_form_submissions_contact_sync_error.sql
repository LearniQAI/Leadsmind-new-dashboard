-- Flags a form submission whose contact create/update step failed, so a
-- lead isn't silently lost from the CRM's perspective while still looking
-- like a normal successful submission to the visitor who filled it out.
ALTER TABLE public.form_submissions ADD COLUMN IF NOT EXISTS contact_sync_error TEXT;
