-- Fix: createCreditNote (src/app/actions/creditNotes.ts) did the credit_notes
-- insert and the invoices.amount_due reduction as two separate, non-atomic
-- Supabase calls -- if the second call failed (network blip, RLS hiccup,
-- process restart) after the first succeeded, the credit note would exist
-- with no corresponding reduction in what the invoice shows as owed, and
-- there was no rollback of the insert. Likewise deleteCreditNote only ever
-- deleted the credit_notes row -- it never restored the amount_due it had
-- reduced, permanently and silently lowering what the invoice shows as owed
-- even after the credit note itself is gone (the UI disclaims this instead
-- of fixing it).
--
-- Fix: do each pair as a single atomic RPC -- one row lock, one transaction,
-- so a failure partway rolls back the whole thing instead of leaving the
-- credit note and the invoice balance out of sync.
CREATE OR REPLACE FUNCTION public.create_credit_note_atomic(
    p_workspace_id UUID,
    p_invoice_id UUID,
    p_contact_id UUID,
    p_credit_number TEXT,
    p_amount NUMERIC,
    p_reason TEXT,
    p_logged_by UUID
) RETURNS TABLE(credit_note_id UUID, new_amount_due NUMERIC) AS $$
DECLARE
    v_amount_due NUMERIC;
    v_amount_paid NUMERIC;
    v_outstanding NUMERIC;
    v_new_amount_due NUMERIC;
    v_credit_note_id UUID;
BEGIN
    -- Row lock so a concurrent credit note against the same invoice can't
    -- read the same pre-credit amount_due this one just read.
    SELECT amount_due, amount_paid INTO v_amount_due, v_amount_paid
    FROM public.invoices
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found in this workspace';
    END IF;

    v_outstanding := COALESCE(v_amount_due, 0) - COALESCE(v_amount_paid, 0);
    IF p_amount > v_outstanding THEN
        RAISE EXCEPTION 'Credit amount cannot exceed the outstanding balance of %', v_outstanding::TEXT;
    END IF;

    INSERT INTO public.credit_notes (
        invoice_id, workspace_id, contact_id, credit_number, amount, reason, status, issue_date, logged_by
    ) VALUES (
        p_invoice_id, p_workspace_id, p_contact_id, p_credit_number, p_amount, p_reason, 'issued', now(), p_logged_by
    ) RETURNING id INTO v_credit_note_id;

    -- Never touch amount_paid here -- it represents real cash collected and
    -- feeds total_collected analytics; a credit note is not a payment.
    v_new_amount_due := GREATEST(0, COALESCE(v_amount_due, 0) - p_amount);
    UPDATE public.invoices
    SET amount_due = v_new_amount_due
    WHERE id = p_invoice_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_credit_note_id, v_new_amount_due;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.delete_credit_note_atomic(
    p_workspace_id UUID,
    p_credit_note_id UUID
) RETURNS TABLE(invoice_id UUID, restored_amount_due NUMERIC) AS $$
DECLARE
    v_invoice_id UUID;
    v_amount NUMERIC;
    v_current_amount_due NUMERIC;
    v_restored_amount_due NUMERIC;
BEGIN
    SELECT cn.invoice_id, cn.amount INTO v_invoice_id, v_amount
    FROM public.credit_notes cn
    WHERE cn.id = p_credit_note_id AND cn.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit note not found in this workspace';
    END IF;

    DELETE FROM public.credit_notes
    WHERE id = p_credit_note_id AND workspace_id = p_workspace_id;

    -- Row lock on the invoice for the same reason as the create path.
    SELECT amount_due INTO v_current_amount_due
    FROM public.invoices
    WHERE id = v_invoice_id AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Invoice itself was deleted separately -- the credit note is still
        -- gone (correct), just nothing left to restore a balance on.
        RETURN QUERY SELECT v_invoice_id, NULL::NUMERIC;
        RETURN;
    END IF;

    v_restored_amount_due := COALESCE(v_current_amount_due, 0) + v_amount;
    UPDATE public.invoices
    SET amount_due = v_restored_amount_due
    WHERE id = v_invoice_id AND workspace_id = p_workspace_id;

    RETURN QUERY SELECT v_invoice_id, v_restored_amount_due;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Same lockdown convention as the most recent atomic-RPC migration
-- (20260902000000_lockdown_campaign_rpcs_and_atomic_total_sent.sql):
-- callers already pass through requireWorkspaceAccess() in
-- src/app/actions/creditNotes.ts before reaching these, and the actions
-- call them via the admin client, so grant to service_role only.
GRANT EXECUTE ON FUNCTION public.create_credit_note_atomic(uuid, uuid, uuid, text, numeric, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_credit_note_atomic(uuid, uuid) TO service_role;
