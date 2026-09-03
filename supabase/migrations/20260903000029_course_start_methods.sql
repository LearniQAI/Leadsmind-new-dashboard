-- Course Start Methods (Method 1: email access link, Method 3: free preview + paywall,
-- Method 4 groundwork: payment plan / installments).
--
-- Built assuming ONE start method per course (matches how pricing_model already works as a
-- single value per course) — Nelly's answer on combinability is still pending per the
-- client's own guide. If methods must become combinable later, start_method becomes a set of
-- independent flags instead of this single enum — a real, contained follow-up migration, not
-- attempted here.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS start_method TEXT NOT NULL DEFAULT 'instant_payment'
    CHECK (start_method IN ('email_access_link', 'instant_payment', 'free_preview_then_paywall', 'payment_plan'));

-- Method 1 sub-field: "Send access link automatically on signup" (true) vs. "Hold for manual
-- approval" (false). Only consulted when start_method = 'email_access_link'.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS email_access_auto_send BOOLEAN NOT NULL DEFAULT true;

-- Method 3 sub-field: number of lessons (by real course-wide position) open to a visitor with
-- no enrollment at all. NULL = no free preview (the default — matches current behavior for
-- every existing course, which has no preview concept today beyond the decorative
-- is_preview flag).
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS free_lesson_count INTEGER;

-- Method 4 groundwork (Part 1 — see docs/lms-start-method-4-installments-part1.md): fixed
-- number of billing cycles for a Stripe Subscription Schedule, and the real, explicit
-- missed-payment policy. Both NULL/default until a course actually uses start_method =
-- 'payment_plan'.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS number_of_payments INTEGER;

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS payment_failure_policy TEXT
    CHECK (payment_failure_policy IS NULL OR payment_failure_policy IN ('pause_immediately', 'grace_period', 'retry_keep_access'));

COMMENT ON COLUMN public.courses.start_method IS
  'How a student gets from signup to inside the course. instant_payment (default, matches all pre-existing courses) = todays real behavior unchanged. email_access_link = Method 1. free_preview_then_paywall = Method 3. payment_plan = Method 4.';

-- NOTE (Method 1, STEP 0 re-confirm): public.enrollments.status has NO CHECK constraint at
-- all (bare TEXT DEFAULT 'active', see 20240101000003_phase3_lms.sql) and no RLS policy
-- inspects it — so the new 'pending_approval' value needs no schema change here. The real
-- fix needed is at the APPLICATION gate, isEnrolmentActive() in src/lib/lms/enrolment.ts,
-- which — being a blocklist, not an allowlist — would otherwise treat an unrecognized status
-- like 'pending_approval' as active. See that file's own diff for the fix.
