-- Task 18 (Milestone 1): refund foundation.
--
-- 1. Capture the Stripe payment_intent id at payment-completion time so a later refund action
--    has something to call stripe.refunds.create() against. Historical rows (paid before this
--    migration) will have this NULL — refund actions must detect that and fall back to a
--    record-only refund rather than attempting a real API call against a null reference.
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- 2. invoices.status previously had no DB-level CHECK constraint at all (free-text column) —
-- adding one now, scoped to every value actually found in use across the codebase today, plus
-- 'refunded'. Deliberately not narrowing to a smaller "ideal" list, to avoid breaking any
-- existing status-transition code path that isn't part of this task.
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'open', 'sent', 'unpaid', 'paid', 'void', 'uncollectible', 'written_off', 'refunded'));

-- 3. Refund audit trail. One row per refund action, whether it resulted in a real gateway API
-- call (Stripe, when a payment_intent is on record) or a record-only entry (PayFast — no public
-- refund API for standard SA merchants — or a historical Stripe payment with no captured
-- payment_intent).
CREATE TABLE IF NOT EXISTS public.refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  enrollment_id UUID REFERENCES public.enrollments(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL CHECK (gateway IN ('stripe', 'payfast')),
  record_only BOOLEAN NOT NULL DEFAULT false,
  gateway_refund_id TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'admin_action' CHECK (source IN ('admin_action', 'stripe_webhook')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for refunds" ON public.refunds;
CREATE POLICY "Workspace access for refunds" ON public.refunds
  FOR ALL USING (check_workspace_access(workspace_id));

CREATE INDEX IF NOT EXISTS idx_refunds_workspace ON public.refunds(workspace_id);
CREATE INDEX IF NOT EXISTS idx_refunds_gateway_refund_id ON public.refunds(gateway_refund_id) WHERE gateway_refund_id IS NOT NULL;
