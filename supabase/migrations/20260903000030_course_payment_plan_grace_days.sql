-- Course Start Method 4, Part 2: real installment billing mechanism.
--
-- Part 1 added courses.number_of_payments + courses.payment_failure_policy
-- ('pause_immediately' | 'grace_period' | 'retry_keep_access'). The 'grace_period' option's
-- UI label is "Grace period, then pause access" but Part 1 shipped no field for the length of
-- that grace period — the spec's own language is "grace period of N days". This adds the real,
-- admin-configurable N.
--
-- Everything else Part 2 needs already exists:
--   * enrollments.grace_period_expires_at  — reused, no new column (set by the
--     invoice.payment_failed handler, cleared by invoice.payment_succeeded).
--   * enrollments.metadata (jsonb)         — holds stripe_subscription_id, stripe_schedule_id,
--     installments_total, installments_paid, payment_failure_policy, grace_period_days,
--     installments_complete. The invoice.* and customer.subscription.deleted handlers already
--     match enrollments by metadata->>'stripe_subscription_id' — Part 2 is the first code that
--     actually populates it.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS grace_period_days INTEGER;

COMMENT ON COLUMN public.courses.grace_period_days IS
  'Course Start Method 4 (payment_plan) with payment_failure_policy = grace_period: how many days a student keeps access after a failed installment before access is cut. NULL falls back to the app default (7). Ignored for the other two failure policies.';
