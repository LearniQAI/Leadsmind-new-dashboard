-- Atomic operations for credit deduction
-- NOTE: acquire_campaign_jobs already exists in
-- 20240101000170_campaign_dispatch_queue.sql
-- and correctly implements FOR UPDATE SKIP LOCKED
-- for campaign job claiming. We do NOT duplicate it here.
-- This migration only adds the missing credit deduction RPC.

-- Atomic AI credit deduction
-- Prevents concurrent requests from exceeding credit limit
-- Returns TRUE if credit was deducted, FALSE if limit exceeded
CREATE OR REPLACE FUNCTION deduct_ai_credit(
  p_workspace_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE ai_usage_credits
  SET credits_used_this_period = credits_used_this_period + 1
  WHERE workspace_id = p_workspace_id
    AND (
      credits_used_this_period + 1
    ) <= (
      plan_monthly_credits + credits_purchased_addon
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- TRUE = credit deducted successfully
  -- FALSE = limit exceeded, caller should return 402
  RETURN v_updated > 0;
END;
$$;

-- Atomic single tag add (race-condition safe)
-- Prevents duplicate tags from concurrent requests
CREATE OR REPLACE FUNCTION add_single_tag(
  p_contact_id UUID,
  p_tag TEXT,
  p_workspace_id UUID
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE contacts
  SET tags = array_append(tags, p_tag)
  WHERE id = p_contact_id
    AND workspace_id = p_workspace_id
    AND NOT (tags @> ARRAY[p_tag]);
$$;
