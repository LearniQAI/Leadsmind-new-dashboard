-- Task 28: Credit Notes screen — the credit_notes table (phase35_invoice_sprint3)
-- was created with no application code ever reading/writing it (confirmed via
-- codebase audit — README.md itself documents it as "backend only, no UI").
-- Adds the fields the real create/list/apply flow needs that the original
-- table never had: a lifecycle status and an explicit issue date, plus an
-- audit trail column matching invoice_write_offs' `logged_by` convention.

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'issued';
-- 'draft' | 'issued' | 'applied' — mirrors invoice_write_offs' free-text status
-- convention (see invoices.status: 'written_off' is not in the original enum
-- comment either) rather than a DB-level CHECK/enum that would need a
-- migration every time a new disposition is added.

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS issue_date TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS logged_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_credit_notes_workspace_id ON credit_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice_id ON credit_notes(invoice_id);
