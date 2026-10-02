-- Counterpart to deduct_ai_credit: gives credits back when a metered AI operation fails after
-- the atomic up-front deduction (first user: the AI research batch route). A single UPDATE, so
-- it is atomic like the deduction, and it can never push usage below zero.
-- Service-role only: ai_usage_credits writes are deliberately closed to client sessions
-- (see 20260722000002), so this must not be callable by anon/authenticated either.
CREATE OR REPLACE FUNCTION refund_ai_credit(
  p_workspace_id UUID,
  p_amount INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated INT;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN FALSE;
  END IF;

  UPDATE ai_usage_credits
  SET credits_used_this_period = GREATEST(credits_used_this_period - p_amount, 0)
  WHERE workspace_id = p_workspace_id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

REVOKE ALL ON FUNCTION refund_ai_credit(UUID, INT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION refund_ai_credit(UUID, INT) TO service_role;
