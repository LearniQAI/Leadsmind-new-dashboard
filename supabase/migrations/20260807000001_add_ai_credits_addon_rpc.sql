-- Dedup log for processed Paystack transaction references, so a retried
-- charge.success webhook delivery (Paystack retries on non-2xx / timeout)
-- can't double-credit a workspace's AI credit addon balance.
CREATE TABLE IF NOT EXISTS public.ai_credits_addon_purchases (
  paystack_reference TEXT PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  credit_amount INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_credits_addon_purchases ENABLE ROW LEVEL SECURITY;
-- Written only by the webhook via the admin/service-role client.
DROP POLICY IF EXISTS "No client access to ai_credits_addon_purchases" ON public.ai_credits_addon_purchases;
CREATE POLICY "No client access to ai_credits_addon_purchases" ON public.ai_credits_addon_purchases
  FOR ALL USING (false) WITH CHECK (false);

-- Atomic counterpart to deduct_ai_credit (20260708000001) for crediting a
-- workspace after a successful one-time AI-credits top-up purchase. Called
-- from the Paystack charge.success webhook handler, never from the client.
-- p_reference dedupes retried webhook deliveries for the same transaction.
CREATE OR REPLACE FUNCTION add_ai_credits_addon(
  p_workspace_id UUID,
  p_amount INT,
  p_reference TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INT;
BEGIN
  INSERT INTO ai_credits_addon_purchases (paystack_reference, workspace_id, credit_amount)
  VALUES (p_reference, p_workspace_id, p_amount)
  ON CONFLICT (paystack_reference) DO NOTHING;

  IF NOT FOUND THEN
    -- Already processed this exact transaction reference.
    RETURN true;
  END IF;

  UPDATE ai_usage_credits
  SET credits_purchased_addon = credits_purchased_addon + p_amount
  WHERE workspace_id = p_workspace_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN v_updated > 0;
END;
$$;
