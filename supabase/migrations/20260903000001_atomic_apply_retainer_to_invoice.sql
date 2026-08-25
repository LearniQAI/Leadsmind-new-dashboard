-- Fix: applyRetainerToInvoice (src/app/actions/retainers.ts) was already
-- hardened for auth/workspace-scoping but had two real correctness gaps on
-- top of being completely unwired from any UI:
--   1. It compared the retainer balance against invoice.total_amount, not
--      the actual outstanding amount (total_amount minus whatever's already
--      been paid or credited) -- an invoice with a prior partial payment or
--      credit note would let a retainer over-apply against it.
--   2. A partial application (retainer balance smaller than what's owed)
--      never touched invoices.amount_due at all -- only a full-coverage
--      application did anything visible, by flipping status to 'paid'.
-- This RPC fixes both, and does the ledger insert + retainer balance update
-- + invoice amount_due update as a single atomic transaction, matching the
-- same standard just applied to credit notes
-- (20260903000000_atomic_credit_notes.sql).
CREATE OR REPLACE FUNCTION public.apply_retainer_to_invoice_atomic(
    p_workspace_id UUID,
    p_invoice_id UUID,
    p_contact_id UUID
) RETURNS TABLE(applied_amount NUMERIC, new_amount_due NUMERIC, invoice_paid BOOLEAN) AS $$
DECLARE
    v_amount_due NUMERIC;
    v_total_amount NUMERIC;
    v_retainer_id UUID;
    v_remaining NUMERIC;
    v_applied NUMERIC;
    v_new_amount_due NUMERIC;
    v_paid BOOLEAN;
BEGIN
    SELECT COALESCE(amount_due, total_amount, 0), COALESCE(total_amount, 0)
        INTO v_amount_due, v_total_amount
    FROM public.invoices
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found in this workspace';
    END IF;

    IF v_amount_due <= 0 THEN
        RAISE EXCEPTION 'This invoice has nothing outstanding to apply a retainer against';
    END IF;

    SELECT id, amount_remaining INTO v_retainer_id, v_remaining
    FROM public.retainers
    WHERE contact_id = p_contact_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND OR v_remaining IS NULL OR v_remaining <= 0 THEN
        RAISE EXCEPTION 'No active retainer balance found';
    END IF;

    v_applied := LEAST(v_amount_due, v_remaining);

    INSERT INTO public.retainer_ledger_entries (
        workspace_id, contact_id, amount, entry_type, invoice_id
    ) VALUES (
        p_workspace_id, p_contact_id, v_applied, 'debit_invoice_apply', p_invoice_id
    );

    UPDATE public.retainers
    SET amount_remaining = v_remaining - v_applied
    WHERE id = v_retainer_id;

    v_new_amount_due := GREATEST(0, v_amount_due - v_applied);
    v_paid := v_new_amount_due <= 0;

    UPDATE public.invoices
    SET amount_due = v_new_amount_due,
        status = CASE WHEN v_paid THEN 'paid' ELSE status END
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_applied, v_new_amount_due, v_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.apply_retainer_to_invoice_atomic(uuid, uuid, uuid) TO service_role;
