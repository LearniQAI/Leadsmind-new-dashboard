-- Paystack billing support + plan tier naming reconciliation.
--
-- Three incompatible tier vocabularies existed before this migration:
--   - marketing/checkout: spark, rise, surge, infinity, dynasty
--   - feature gates:      free, starter, growth, agency, enterprise
--   - db/type-level:      free, pro, enterprise, agency
-- The Stripe webhook writes the marketing tier id verbatim into plan_tier,
-- so paid customers' feature gates never matched. Canonical vocabulary from
-- here on is the marketing/checkout one (spark/rise/surge/infinity/dynasty),
-- since that's what customers actually purchase. Application code was
-- updated in the same change to compare against these names.

-- 1. Paystack identifiers, parallel to the existing stripe_customer_id /
--    stripe_subscription_id columns. Additive — Stripe columns untouched.
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS paystack_customer_code TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS paystack_subscription_code TEXT;

CREATE INDEX IF NOT EXISTS idx_workspaces_paystack_subscription_code
  ON public.workspaces(paystack_subscription_code);

-- 2. Backfill plan_tier from every legacy vocabulary observed in the
--    codebase to the canonical set before enforcing a CHECK constraint.
UPDATE public.workspaces
SET plan_tier = CASE plan_tier
  WHEN 'free' THEN 'spark'
  WHEN 'starter' THEN 'rise'
  WHEN 'growth' THEN 'surge'
  WHEN 'agency' THEN 'infinity'
  WHEN 'enterprise' THEN 'dynasty'
  WHEN 'pro' THEN 'surge'
  ELSE plan_tier
END
WHERE plan_tier IN ('free', 'starter', 'growth', 'agency', 'enterprise', 'pro');

ALTER TABLE public.workspaces ALTER COLUMN plan_tier SET DEFAULT 'spark';

ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_tier_check;
ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_plan_tier_check
  CHECK (plan_tier IN ('spark', 'rise', 'surge', 'infinity', 'dynasty'));

-- 3. The legacy `plan` column (separate from plan_tier, still read as a
--    fallback in src/app/actions/portal.ts) had its own free/pro/enterprise
--    CHECK constraint — drop it BEFORE backfilling (the old constraint would
--    otherwise reject the canonical values), then reconcile the same way to
--    kill the 3-way drift.
ALTER TABLE public.workspaces DROP CONSTRAINT IF EXISTS workspaces_plan_check;

UPDATE public.workspaces
SET plan = CASE plan
  WHEN 'free' THEN 'spark'
  WHEN 'starter' THEN 'rise'
  WHEN 'growth' THEN 'surge'
  WHEN 'agency' THEN 'infinity'
  WHEN 'enterprise' THEN 'dynasty'
  WHEN 'pro' THEN 'surge'
  ELSE plan
END
WHERE plan IN ('free', 'starter', 'growth', 'agency', 'enterprise', 'pro');

ALTER TABLE public.workspaces ALTER COLUMN plan SET DEFAULT 'spark';

ALTER TABLE public.workspaces
  ADD CONSTRAINT workspaces_plan_check
  CHECK (plan IN ('spark', 'rise', 'surge', 'infinity', 'dynasty'));

-- 4. Fix the confirmed bug: setup_workspace() (the auto-create-workspace
--    fallback used by src/lib/auth.ts's getCurrentWorkspace()) hardcoded
--    new workspaces to 'pro', silently granting paid-tier access, while
--    the explicit createWorkspace() action correctly defaults to free/spark.
CREATE OR REPLACE FUNCTION setup_workspace(
  p_user_id UUID,
  p_workspace_name TEXT,
  p_slug TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_workspace_id UUID;
  v_final_slug TEXT;
  v_counter INT := 0;
BEGIN
  -- Ensure user row exists
  INSERT INTO users (id, email)
  SELECT p_user_id, email
  FROM auth.users
  WHERE id = p_user_id
  ON CONFLICT (id) DO NOTHING;

  -- Handle slug uniqueness with auto-increment
  v_final_slug := p_slug;
  LOOP
    BEGIN
      INSERT INTO workspaces (
        name,
        slug,
        owner_id,
        plan,
        plan_tier
      )
      VALUES (
        p_workspace_name,
        v_final_slug,
        p_user_id,
        'spark',
        'spark'
      )
      RETURNING id INTO v_workspace_id;
      EXIT; -- success, exit loop
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      v_final_slug := p_slug || '-' || v_counter;
    END;
  END LOOP;

  -- Add user as admin member
  -- ON CONFLICT handles race conditions gracefully
  INSERT INTO workspace_members (
    workspace_id,
    user_id,
    role
  )
  VALUES (
    v_workspace_id,
    p_user_id,
    'admin'
  )
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- If ANY step above failed, PostgreSQL rolls back
  -- the entire function automatically
  RETURN v_workspace_id;
END;
$$;
