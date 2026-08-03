-- FIX: invoices is missing a payment_method column that three existing call sites
-- (the PayFast webhook's invoice-payment update, its course-purchase insert, and
-- the new funnel_orders insert) already assume exists, silently breaking all three
-- (PGRST204 "Could not find the 'payment_method' column"). Confirmed against the
-- live schema before writing — see chat for the empirical repro.
--
-- amount_due's NOT NULL constraint is NOT loosened here: every legitimate invoice
-- writer in this codebase (InvoiceBuilder, PaymentPlanBuilder, the automation
-- engine's create_invoice action, the booking-consultation PayFast webhook) already
-- explicitly sets amount_due = the full billed amount at creation time, and every
-- reader (portal invoice views, finance.ts, SegmentationCompiler's "amount owed"
-- queries) computes outstanding balance as `amount_due - amount_paid`. The
-- constraint is doing its job correctly; the broken call sites are fixed in code
-- instead (same commit).
ALTER TABLE public.invoices
    ADD COLUMN IF NOT EXISTS payment_method TEXT;
