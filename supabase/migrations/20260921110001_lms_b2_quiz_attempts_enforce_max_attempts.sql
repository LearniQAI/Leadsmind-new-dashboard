-- LMS batch 2 / fix 1: quiz_settings.max_attempts was only a UI lock (StudentQuizClient
-- attemptsCount). Direct calls to submitQuizAttempt allowed unlimited retakes, making the remedial
-- unlock cosmetic. This trigger is the atomic backstop (advisory lock per student+lesson closes the
-- count-then-insert race for parallel requests); submitQuizAttempt also pre-checks for a clean error.
-- Mirrors the UI exactly: limit = COALESCE(NULLIF(max_attempts,0),3); a PASSED remedial assignment
-- lifts the lock (the remedial pass inserts its own synthetic attempt AFTER marking passed).
-- Lesson quizzes only: the UI never locked module quizzes and there is no instructor "reset attempts"
-- feature yet, so module quizzes stay unlimited (flagged for follow-up).
-- Existing rows: quiz_attempts had 0 rows at apply time, so nothing existing is affected.
-- Rollback: DROP TRIGGER quiz_attempts_enforce_max_attempts ON public.quiz_attempts;
--           DROP FUNCTION public.quiz_attempts_enforce_max_attempts();
CREATE OR REPLACE FUNCTION public.quiz_attempts_enforce_max_attempts()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_max int;
  v_count int;
BEGIN
  IF NEW.lesson_id IS NULL OR NEW.student_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.student_id::text || ':' || NEW.lesson_id::text, 0));

  SELECT COALESCE(NULLIF(max_attempts, 0), 3) INTO v_max
    FROM public.quiz_settings WHERE lesson_id = NEW.lesson_id;
  IF v_max IS NULL THEN v_max := 3; END IF;

  SELECT count(*) INTO v_count
    FROM public.quiz_attempts
   WHERE lesson_id = NEW.lesson_id AND student_id = NEW.student_id;

  IF v_count >= v_max AND NOT EXISTS (
    SELECT 1 FROM public.lms_remedial_assignments r
     WHERE r.contact_id = NEW.student_id AND r.lesson_id = NEW.lesson_id AND r.status = 'passed'
  ) THEN
    RAISE EXCEPTION 'Maximum quiz attempts reached (%). Complete the remedial path to unlock more.', v_max
      USING ERRCODE = 'LM001';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quiz_attempts_enforce_max_attempts ON public.quiz_attempts;
CREATE TRIGGER quiz_attempts_enforce_max_attempts
  BEFORE INSERT ON public.quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.quiz_attempts_enforce_max_attempts();
