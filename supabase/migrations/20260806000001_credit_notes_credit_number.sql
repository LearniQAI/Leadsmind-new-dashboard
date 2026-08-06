-- Corrective migration: the live credit_notes table was actually created by
-- 20240101000032_phase16_leadsmind_invoice.sql (workspace_id, contact_id NOT
-- NULL, invoice_id nullable, amount, reason, created_at — no credit_number).
-- A later migration (20240101000068_phase35_invoice_sprint3.sql) attempted
-- `CREATE TABLE IF NOT EXISTS credit_notes` with a different shape
-- (credit_number UNIQUE, no contact_id) — since the table already existed,
-- that CREATE TABLE was a silent no-op and credit_number/its UNIQUE
-- constraint never actually reached the live schema. Confirmed via the live
-- PostgREST OpenAPI schema (not just reading migration files), which is why
-- this is a separate corrective migration rather than trusting sprint3's
-- CREATE TABLE statement.

ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS credit_number TEXT;
ALTER TABLE credit_notes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'credit_notes_credit_number_key'
  ) THEN
    ALTER TABLE credit_notes ADD CONSTRAINT credit_notes_credit_number_key UNIQUE (credit_number);
  END IF;
END $$;
