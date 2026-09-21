-- LMS security batch 1 / S6: enrolled students could SELECT quiz_questions / module_quiz_questions
-- with the answer key (correct_answer, metadata, explanation) straight from PostgREST.
-- Every student-facing reader (quiz pages, gradeQuiz, gradeModuleQuiz, certificate route) uses the
-- service role and strips keys via buildClientQuestion; no student JWT path reads these tables, so the
-- student SELECT policies are dropped outright (stricter than a column-restricted view, same app
-- behaviour). Instructors keep their workspace-member ALL policies.
DROP POLICY IF EXISTS "students read quiz_questions for enrolled courses" ON public.quiz_questions;
DROP POLICY IF EXISTS "students read module_quiz_questions for enrolled courses" ON public.module_quiz_questions;
