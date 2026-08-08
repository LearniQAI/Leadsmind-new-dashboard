-- credit_notes.workspace_id and invoice_write_offs.workspace_id were created
-- (phase35_invoice_sprint3) with plain `REFERENCES` on workspace_id (implicit
-- ON DELETE NO ACTION) — the two remaining gaps in the workspace-cascade cleanup
-- already applied to contacts, retainers, tag_history/meet_audit_trails, and the
-- accounting tables. Left as-is, deleting a workspace with any credit note or
-- write-off row would hard-fail with a 23503 FK violation instead of cascading.
-- CASCADE matches the convention every other workspace-scoped table in this app uses.

ALTER TABLE credit_notes DROP CONSTRAINT IF EXISTS credit_notes_workspace_id_fkey;
ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

ALTER TABLE invoice_write_offs DROP CONSTRAINT IF EXISTS invoice_write_offs_workspace_id_fkey;
ALTER TABLE invoice_write_offs ADD CONSTRAINT invoice_write_offs_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_credit_notes_workspace_id ON credit_notes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoice_write_offs_workspace_id ON invoice_write_offs(workspace_id);
