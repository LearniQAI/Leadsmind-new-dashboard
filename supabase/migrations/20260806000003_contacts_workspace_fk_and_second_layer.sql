-- Highest-priority item from the FK-scoping audit (62 workspace-scoped tables
-- with no FK protection): contacts.workspace_id has NEVER had a foreign key
-- constraint at all (confirmed via information_schema — not NO ACTION, just
-- absent). Just proven live: deleting a workspace with a real contact left
-- the contact orphaned silently, no error, no cascade.
--
-- contacts.workspace_id is NOT NULL, and every downstream table already
-- treats "the contact's data dies with the workspace" as the intended model
-- (76 FKs to contacts.id checked via information_schema — the large majority
-- are already CASCADE/SET NULL). No compliance/retention finding (POPIA/FICA
-- audit-log language in finance/reports, gdpr_requests' own SET NULL) argues
-- for archiving contacts on a full workspace teardown — that's a per-contact
-- GDPR-erasure concern, not a workspace-deletion concern. CASCADE matches
-- every sibling workspace-scoped table already fixed this way (retainers,
-- credit_notes, tag_history).
--
-- Two pre-existing orphaned contacts (delivered@resend.dev / bounced@resend.dev,
-- Resend sandbox test addresses pointing at an already-deleted workspace) were
-- found and removed before this constraint was added (would otherwise fail to
-- add against violating rows) — confirmed to have zero downstream records
-- first.
ALTER TABLE contacts
  ADD CONSTRAINT contacts_workspace_id_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts(workspace_id);

-- Second-layer gap found while mapping contacts' downstream dependents: two
-- of the 76 FKs pointing at contacts.id were still NO ACTION rather than the
-- CASCADE/SET NULL every sibling table already uses. Both contact_id columns
-- are nullable, matching tasks.contact_id/orders.contact_id/projects.contact_id
-- — SET NULL detaches the reference on contact deletion while preserving the
-- expense/time record itself (a financial/work record shouldn't disappear
-- just because the contact it was logged against was later deleted).
ALTER TABLE expenses DROP CONSTRAINT expenses_contact_id_fkey;
ALTER TABLE expenses ADD CONSTRAINT expenses_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;

ALTER TABLE time_entries DROP CONSTRAINT time_entries_contact_id_fkey;
ALTER TABLE time_entries ADD CONSTRAINT time_entries_contact_id_fkey
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL;
