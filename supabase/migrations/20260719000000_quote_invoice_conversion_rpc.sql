-- Atomic, idempotent quote -> invoice conversion.
--
-- Replaces the previous two-step app-layer flow (insert invoice, then update
-- quote) with a single function call so both writes succeed or fail together.
-- Also makes re-running the conversion on an already-converted quote a no-op
-- that returns the existing invoice instead of creating a duplicate.
--
-- SECURITY INVOKER (default): runs as the calling user, so existing RLS
-- policies on quotes/invoices (workspace membership) still apply — this does
-- not open a new privileged path around the app-layer workspace check.
CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(
  p_quote_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  invoice_id UUID,
  already_converted BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_quote quotes%ROWTYPE;
  v_invoice_id UUID;
  v_invoice_number TEXT;
  v_year TEXT;
  v_count INT;
BEGIN
  -- Lock the quote row for the duration of this transaction so two
  -- concurrent conversion attempts can't both pass the status check.
  SELECT * INTO v_quote
  FROM quotes
  WHERE id = p_quote_id
    AND workspace_id = p_workspace_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, false, 'Quote not found'::TEXT;
    RETURN;
  END IF;

  -- Idempotent: calling this again on an already-converted quote returns
  -- the existing invoice rather than creating a second one.
  IF v_quote.status = 'converted' AND v_quote.converted_invoice_id IS NOT NULL THEN
    RETURN QUERY SELECT true, v_quote.converted_invoice_id, true, NULL::TEXT;
    RETURN;
  END IF;

  IF v_quote.status <> 'accepted' THEN
    RETURN QUERY SELECT false, NULL::UUID, false, 'Only accepted quotes can be converted'::TEXT;
    RETURN;
  END IF;

  v_year := extract(year FROM now())::TEXT;
  SELECT count(*) INTO v_count FROM invoices WHERE workspace_id = p_workspace_id;
  v_invoice_number := 'INV-' || v_year || '-' || (v_count + 1001);

  INSERT INTO invoices (
    workspace_id, contact_id, invoice_number, status,
    items, subtotal, tax_total, total_amount,
    shipping_charges, adjustment, terms_and_conditions,
    amount_due, amount_paid
  ) VALUES (
    p_workspace_id, v_quote.contact_id, v_invoice_number, 'draft',
    v_quote.items, v_quote.subtotal, v_quote.tax_total, v_quote.total_amount,
    v_quote.shipping_charges, v_quote.adjustment, v_quote.terms_and_conditions,
    v_quote.total_amount, 0
  )
  RETURNING id INTO v_invoice_id;

  UPDATE quotes
  SET status = 'converted', converted_invoice_id = v_invoice_id, updated_at = now()
  WHERE id = p_quote_id AND workspace_id = p_workspace_id;

  RETURN QUERY SELECT true, v_invoice_id, false, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(UUID, UUID) TO authenticated;
