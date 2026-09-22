-- LMS security batch 1 / S4: students could INSERT/UPDATE their own lesson_block_completions and
-- lesson_reading_completions directly (ALL policy), bypassing watch-threshold/quiz/assignment gating.
-- Every writer in code is service-role (blockCompletion.ts, studentProgress.ts, quizzes.ts,
-- assignments route, remedial submit), so students keep read-own only.
DROP POLICY IF EXISTS "students manage their own lesson_block_completions" ON public.lesson_block_completions;
CREATE POLICY "students read own lesson_block_completions" ON public.lesson_block_completions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts ct
                 WHERE ct.id = lesson_block_completions.contact_id AND ct.email = (auth.jwt() ->> 'email')));

DROP POLICY IF EXISTS "students manage their own lesson_reading_completions" ON public.lesson_reading_completions;
CREATE POLICY "students read own lesson_reading_completions" ON public.lesson_reading_completions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.contacts ct
                 WHERE ct.id = lesson_reading_completions.contact_id AND ct.email = (auth.jwt() ->> 'email')));
