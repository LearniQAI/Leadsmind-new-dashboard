-- Task 29: retainers/retainer_ledger_entries were created (phase36_invoice_advanced)
-- with plain `REFERENCES` (implicit ON DELETE NO ACTION) on every FK — confirmed
-- live via information_schema.referential_constraints, not just the migration file.
-- Both tables are currently empty, so this has been dormant, but this task is what
-- gives them real data for the first time: once populated, deleting a workspace,
-- contact, or invoice referenced by a retainer/ledger row would hard-fail with a
-- 23503 FK violation instead of cleaning up, same landmine class already fixed for
-- other tables in this app (e.g. the tag_history/meet_audit_trails workspace-cascade
-- fix). CASCADE matches the convention every other workspace/contact/invoice-scoped
-- table in this app uses (e.g. credit_notes).

ALTER TABLE retainers DROP CONSTRAINT retainers_workspace_id_fkey;
ALTER TABLE retainers ADD CONSTRAINT retainers_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE retainers DROP CONSTRAINT retainers_contact_id_fkey;
ALTER TABLE retainers ADD CONSTRAINT retainers_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

ALTER TABLE retainer_ledger_entries DROP CONSTRAINT retainer_ledger_entries_workspace_id_fkey;
ALTER TABLE retainer_ledger_entries ADD CONSTRAINT retainer_ledger_entries_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE retainer_ledger_entries DROP CONSTRAINT retainer_ledger_entries_contact_id_fkey;
ALTER TABLE retainer_ledger_entries ADD CONSTRAINT retainer_ledger_entries_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE;

-- invoice_id is nullable and represents "which invoice this credit was applied to" —
-- if the invoice itself is deleted, the ledger entry should keep existing as a
-- historical record (it still reflects a real credit/debit against the retainer),
-- just with the invoice reference cleared, rather than deleting financial history.
ALTER TABLE retainer_ledger_entries DROP CONSTRAINT retainer_ledger_entries_invoice_id_fkey;
ALTER TABLE retainer_ledger_entries ADD CONSTRAINT retainer_ledger_entries_invoice_id_fkey
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_retainers_workspace_id ON retainers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_retainers_contact_id ON retainers(contact_id);
CREATE INDEX IF NOT EXISTS idx_retainer_ledger_entries_workspace_id ON retainer_ledger_entries(workspace_id);
CREATE INDEX IF NOT EXISTS idx_retainer_ledger_entries_contact_id ON retainer_ledger_entries(contact_id);
