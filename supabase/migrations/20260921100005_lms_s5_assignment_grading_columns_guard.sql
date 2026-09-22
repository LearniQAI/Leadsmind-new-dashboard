-- LMS security batch 1 / S5: students could UPDATE/INSERT lms_assignment_submissions with no column
-- restriction (self-grade). The app writes via the service role; direct student writes are kept
-- (their own text/file content) but every grading/identity column is locked by this trigger.
-- Privileged roles (postgres/service_role) and workspace members (instructors) are unrestricted.
CREATE OR REPLACE FUNCTION public.lms_assignment_submissions_guard()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;
  IF public.check_workspace_access(COALESCE(NEW.workspace_id, OLD.workspace_id)) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (SELECT 1 FROM public.courses c WHERE c.id = NEW.course_id AND c.workspace_id = NEW.workspace_id) THEN
      RAISE EXCEPTION 'course/workspace mismatch' USING ERRCODE = '42501';
    END IF;
    NEW.grade_status := 'pending';
    NEW.feedback_comments := NULL;
    NEW.graded_at := NULL;
    NEW.graded_by_user_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.grade_status IS DISTINCT FROM OLD.grade_status
     OR NEW.feedback_comments IS DISTINCT FROM OLD.feedback_comments
     OR NEW.graded_at IS DISTINCT FROM OLD.graded_at
     OR NEW.graded_by_user_id IS DISTINCT FROM OLD.graded_by_user_id
     OR NEW.workspace_id IS DISTINCT FROM OLD.workspace_id
     OR NEW.course_id IS DISTINCT FROM OLD.course_id
     OR NEW.lesson_id IS DISTINCT FROM OLD.lesson_id
     OR NEW.contact_id IS DISTINCT FROM OLD.contact_id THEN
    RAISE EXCEPTION 'students cannot modify grading or identity columns' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS lms_assignment_submissions_guard ON public.lms_assignment_submissions;
CREATE TRIGGER lms_assignment_submissions_guard
  BEFORE INSERT OR UPDATE ON public.lms_assignment_submissions
  FOR EACH ROW EXECUTE FUNCTION public.lms_assignment_submissions_guard();
