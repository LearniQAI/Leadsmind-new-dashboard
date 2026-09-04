-- Cohorts, Part 1 — schema, seat enforcement.
--
-- STEP 0 confirmed: no course_cohorts / cohort_students table and no cohorts.ts exist
-- anywhere (the old dead scaffold referenced in the audit's G11 is fully absent). This is a
-- fresh build. courses.enrolment_cap is KEPT AS-IS: it stays the course-wide fallback cap
-- for non-cohort courses (~15 call sites check `count(enrollments) >= enrolment_cap`).
-- Cohorts get their own separate per-cohort seat_cap — repurposing enrolment_cap would risk
-- every one of those call sites for no benefit.

-- Orthogonal, opt-in per course. Independent of courses.start_method (which governs HOW a
-- student pays/gets approved; cohorts govern WHICH scheduled group + seat cap). No conflict:
-- a cohort course can still be instant_payment / payment_plan / email_access_link /
-- free_preview_then_paywall.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS cohorts_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.course_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  seat_cap INTEGER NOT NULL CHECK (seat_cap > 0),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_course_cohorts_course ON public.course_cohorts(course_id);

ALTER TABLE public.course_cohorts ENABLE ROW LEVEL SECURITY;

-- Same workspace-scoped staff-management pattern as courses / course_modules etc.
DROP POLICY IF EXISTS "Workspace members manage course_cohorts" ON public.course_cohorts;
CREATE POLICY "Workspace members manage course_cohorts" ON public.course_cohorts
  FOR ALL TO authenticated
  USING (public.check_workspace_access(workspace_id))
  WITH CHECK (public.check_workspace_access(workspace_id));

-- Real, nullable cohort_id on enrollments. ON DELETE SET NULL rather than CASCADE: a cohort
-- can only be deleted when it has zero enrollments (enforced in courseCohorts.ts), so this
-- SET NULL is a belt-and-braces guard, never a silent data loss path for real students.
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.course_cohorts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_cohort ON public.enrollments(cohort_id);

-- Authoritative, path-independent seat-cap guard. Every enrollment-creation path in the app
-- runs through the service-role client (RLS INSERT on enrollments is deny-all for students);
-- this trigger makes the seat cap impossible to exceed regardless of which of those paths
-- (self-enroll, guest checkout, Stripe webhook, admin roster, automation) inserts the row.
CREATE OR REPLACE FUNCTION public.enforce_cohort_seat_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cap INTEGER;
  taken INTEGER;
BEGIN
  IF NEW.cohort_id IS NULL THEN
    RETURN NEW;
  END IF;
  -- On UPDATE that doesn't change the cohort, nothing to re-check.
  IF TG_OP = 'UPDATE' AND NEW.cohort_id IS NOT DISTINCT FROM OLD.cohort_id THEN
    RETURN NEW;
  END IF;

  SELECT seat_cap INTO cap FROM public.course_cohorts WHERE id = NEW.cohort_id;
  IF cap IS NULL THEN
    RAISE EXCEPTION 'cohort % does not exist', NEW.cohort_id;
  END IF;

  SELECT count(*) INTO taken
  FROM public.enrollments
  WHERE cohort_id = NEW.cohort_id
    AND (TG_OP <> 'UPDATE' OR id <> NEW.id)
    AND coalesce(status, 'active') NOT IN
        ('cancelled', 'canceled', 'rejected', 'revoked', 'expired', 'inactive');

  IF taken >= cap THEN
    RAISE EXCEPTION 'cohort_full: cohort % is at capacity (%/%)', NEW.cohort_id, taken, cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_enforce_cohort_seat_cap ON public.enrollments;
CREATE TRIGGER tr_enforce_cohort_seat_cap
  BEFORE INSERT OR UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_cohort_seat_cap();

COMMENT ON TABLE public.course_cohorts IS
  'Cohorts, Part 1: a scheduled group of students moving through a course together — shared start_date, optional end_date, per-cohort seat_cap. Opt-in per course via courses.cohorts_enabled. Part 2 extends the module/lesson drip system to be cohort-start-relative.';
