-- PayFast bypass fix (Milestone 1 re-audit): "paid" was settable directly via
-- PATCH /api/v1/invoices/[id] (any workspace API key, no payment proof) and via
-- finance.ts::updateInvoiceStatus (any workspace member, no payment proof, no
-- role gate). Both paths now refuse to set status to 'paid' directly. The only
-- remaining legitimate way to mark an invoice paid without a real PayFast ITN
-- is the new markInvoicePaidManually() server action, restricted to admin/owner
-- and requiring a reason, which is logged here — distinct and queryable
-- separately from a real gateway-verified payment (invoices.payment_method =
-- 'payfast' vs 'manual', already-existing column from 20260803000001).

CREATE TABLE IF NOT EXISTS public.invoice_manual_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    logged_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.invoice_manual_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage manual payment logs for their workspace"
    ON public.invoice_manual_payments FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_invoice_manual_payments_workspace_id ON public.invoice_manual_payments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_invoice_manual_payments_invoice_id ON public.invoice_manual_payments(invoice_id);
