-- Fix: invoices.paid_at is referenced throughout the codebase (Attribution
-- Engine.trackInvoicePayment, src/lib/analytics.ts's dashboard revenue-trend
-- KPI, retainers.ts, the public /api/v1/invoices/[id] PATCH endpoint, the
-- portal invoice page, StatementGeneratorModal) but no migration ever
-- created it on public.invoices — confirmed via `supabase migration list`
-- (all prior migrations already applied remotely) and a full grep of every
-- migration file (the only existing `paid_at` column anywhere belongs to
-- the unrelated public.payroll_runs table from the HR/payroll module).
--
-- updated_at is not a substitute: it's a generic modified-timestamp shared
-- by drafts/edits/voids, and using it would misattribute revenue-by-date
-- for any invoice edited after being marked paid. Additive only.
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL;
