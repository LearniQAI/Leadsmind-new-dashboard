-- Extends deduct_ai_credit to support variable-cost deductions (seoChecker
-- charges 3, plagiarismChecker charges 5 — the original migration only
-- supported a fixed +1), backfills ai_usage_credits for every existing
-- workspace (the table has existed since phase96 but nothing ever inserted
-- into it, so the RPC previously matched zero rows for every workspace),
-- and auto-provisions a row for every new workspace going forward.

-- 1. Variable-amount atomic AI credit deduction
CREATE OR REPLACE FUNCTION deduct_ai_credit(
  p_workspace_id UUID,
  p_amount INT DEFAULT 1
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated INT;
BEGIN
  UPDATE ai_usage_credits
  SET credits_used_this_period = credits_used_this_period + p_amount
  WHERE workspace_id = p_workspace_id
    AND (
      credits_used_this_period + p_amount
    ) <= (
      plan_monthly_credits + credits_purchased_addon
    );

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- TRUE = credit deducted successfully
  -- FALSE = limit exceeded or no ai_usage_credits row for this workspace
  RETURN v_updated > 0;
END;
$$;

-- 2. Backfill: give every existing workspace a row, preserving its current
-- effective balance (workspaces.ai_credits was the old remaining-balance
-- column; plan_monthly_credits defaults to 100 to match the ?? 100 fallback
-- used throughout the app, so credits_used_this_period = 100 - remaining).
INSERT INTO ai_usage_credits (
  workspace_id,
  plan_monthly_credits,
  credits_used_this_period,
  credits_purchased_addon,
  billing_cycle_start,
  billing_cycle_end
)
SELECT
  w.id,
  100,
  GREATEST(100 - COALESCE(w.ai_credits, 100), 0),
  0,
  date_trunc('month', now())::date,
  (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date
FROM workspaces w
ON CONFLICT (workspace_id) DO NOTHING;

-- 3. Auto-provision a row for every new workspace going forward
CREATE OR REPLACE FUNCTION fn_provision_ai_usage_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO ai_usage_credits (
    workspace_id,
    plan_monthly_credits,
    credits_used_this_period,
    credits_purchased_addon,
    billing_cycle_start,
    billing_cycle_end
  )
  VALUES (
    NEW.id,
    100,
    0,
    0,
    date_trunc('month', now())::date,
    (date_trunc('month', now()) + interval '1 month' - interval '1 day')::date
  )
  ON CONFLICT (workspace_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_provision_ai_usage_credits ON workspaces;
CREATE TRIGGER tr_provision_ai_usage_credits
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION fn_provision_ai_usage_credits();
