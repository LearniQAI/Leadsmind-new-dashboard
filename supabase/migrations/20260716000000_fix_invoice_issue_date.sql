-- The invoice builder was writing the user-editable "issue date" into
-- invoices.created_at (there was no dedicated column), corrupting the
-- audit-trail timestamp every time an invoice was saved or edited.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS issue_date DATE DEFAULT CURRENT_DATE;
