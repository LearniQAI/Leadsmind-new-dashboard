-- The live `quotes` table was created by 20240101000031_phase16_invoicing_sprint1.sql,
-- which won the `CREATE TABLE IF NOT EXISTS quotes` race (see
-- 20260719000002_fix_quote_invoice_conversion_rpc.sql for the same pattern already
-- found and fixed for `converted_invoice_id`). That first migration never defined
-- `items` or `valid_until`, but the new-quote save path (src/app/actions/quotes.ts
-- saveQuote(), fed by src/components/quotes/QuoteClientWrapper.tsx) always sends
-- both fields, so every "Finalise document" / "Save as draft" insert on
-- /quotes/new fails with a Postgres "column does not exist" error, surfaced to
-- the user only as the generic "Failed to save quote." toast.
--
-- `invoices` already has `items JSONB DEFAULT '[]'::jsonb` (see
-- 20240101000060_phase33_invoice_sprint1.sql) — this brings `quotes` in line.

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ;
