-- AI Bookkeeping (Session B) — categorization, reconciliation, anomaly/tax flags.
--
-- accounting_transactions.source_type has no CHECK constraint (free text, see
-- 20240101000037_phase18_accounting_logic.sql) so document-derived rows reuse the existing
-- 'bank_feed' value unchanged — this keeps them visible in the real Reconciliation page
-- (src/app/finance/reconciliation/page.tsx), which already queries source_type='bank_feed',
-- rather than inventing a new value that page doesn't know about.
--
-- document_id is a NEW, separate column (not reusing source_id) because source_id already
-- has a real meaning on this table: the matched invoice id once a transaction is reconciled
-- (src/app/finance/reconciliation/page.tsx handleMatch()). Overloading it for provenance
-- would break that matching logic.
ALTER TABLE public.accounting_transactions
  ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.financial_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_source TEXT NOT NULL DEFAULT 'manual' CHECK (category_source IN ('manual', 'ai_suggested')),
  ADD COLUMN IF NOT EXISTS is_duplicate_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_anomaly_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS anomaly_note TEXT,
  ADD COLUMN IF NOT EXISTS tax_deduction_candidate BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS accounting_transactions_document_id_idx ON public.accounting_transactions(document_id);

-- Receipts/invoices are evidence FOR a bank transaction, not a transaction themselves — kept
-- as a separate table (not folded into accounting_transactions) so a receipt with no matching
-- bank transaction yet doesn't distort P&L/cash-flow totals, which already sum
-- accounting_transactions directly (src/app/finance/reports/page.tsx). matched_transaction_id
-- is populated by the real reconciliation step (amount + date proximity), same spirit as the
-- existing manual invoice<->transaction matching on the Reconciliation page, just automated
-- for this one evidence type.
CREATE TABLE IF NOT EXISTS public.document_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.financial_documents(id) ON DELETE CASCADE,
  vendor TEXT,
  receipt_date DATE,
  amount NUMERIC(14,2),
  note TEXT,
  matched_transaction_id UUID REFERENCES public.accounting_transactions(id) ON DELETE SET NULL,
  tax_deduction_candidate BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_receipts_workspace_id_idx ON public.document_receipts(workspace_id);
CREATE INDEX IF NOT EXISTS document_receipts_document_id_idx ON public.document_receipts(document_id);

ALTER TABLE public.document_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "workspace members manage document_receipts" ON public.document_receipts;
CREATE POLICY "workspace members manage document_receipts"
  ON public.document_receipts FOR ALL
  USING (workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  ));

-- Per-upload-job notification override (PRD 4.5: "an optional field at upload time, not a
-- permanent account setting change"). No existing precedent for a caller-supplied destination
-- email anywhere in this app (confirmed in the Session A audit) — format-validated at the API
-- layer, defaults to the uploader's account email when absent.
ALTER TABLE public.financial_documents
  ADD COLUMN IF NOT EXISTS notify_email TEXT,
  ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;
