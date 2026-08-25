-- Fix: Chart of Accounts (src/app/actions/chartOfAccounts.ts, /finance/chart-of-accounts)
-- was a fully real, working data-entry screen with real journal_entries writes for PayFast
-- payments, but /finance/reports never read chart_of_accounts or journal_entries at all --
-- creating or editing an account had zero visible effect anywhere in Reports. Per product
-- decision: transactions can now optionally be tagged with an account, and Reports shows a
-- real breakdown by account alongside the existing source_type grouping -- a smaller, additive
-- change rather than reworking Reports to be journal_entries-driven.
ALTER TABLE public.accounting_transactions
    ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_accounting_transactions_account_id
    ON public.accounting_transactions(account_id);
