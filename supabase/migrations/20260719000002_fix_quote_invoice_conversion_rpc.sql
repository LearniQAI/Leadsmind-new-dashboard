-- Fixes convert_quote_to_invoice (20260719000000_quote_invoice_conversion_rpc.sql)
-- against the ACTUAL live `quotes` schema, which was discovered during
-- verification to differ from what the migration history implies:
--   - `quotes.items` does not exist (only ever defined inside a
--     `CREATE TABLE IF NOT EXISTS quotes` in a later migration that no-op'd
--     because an earlier migration had already created the table without it)
--   - `quotes.converted_invoice_id` does not exist for the same reason —
--     meaning the original app-layer conversion's second step (marking the
--     quote converted) has never actually succeeded in production; every
--     past conversion attempt left an orphaned draft invoice with the quote
--     still showing an unconverted status. This migration adds the column
--     the app-layer code already assumed existed.

ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS converted_invoice_id UUID REFERENCES public.invoices(id);

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

  -- NOTE: quotes has no line-item storage in the live schema (no `items`
  -- column, and nothing populates the vestigial `invoice_items.quote_id`
  -- either) — the created invoice's `items` is left at its column default
  -- ('[]'::jsonb). This is a pre-existing data-model gap, not something
  -- this conversion step can recover data for.
  INSERT INTO invoices (
    workspace_id, contact_id, invoice_number, status,
    subtotal, tax_total, total_amount,
    shipping_charges, adjustment, terms_and_conditions,
    amount_due, amount_paid
  ) VALUES (
    p_workspace_id, v_quote.contact_id, v_invoice_number, 'draft',
    v_quote.subtotal, v_quote.tax_total, v_quote.total_amount,
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
