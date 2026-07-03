-- Migration: Add student-facing RLS policies for LMS catalog, modules, lessons, and quizzes
-- File: supabase/migrations/20260602000003_student_rls_policies.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Contacts Policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read own contact record" ON public.contacts;
CREATE POLICY "students read own contact record"
  ON public.contacts FOR SELECT
  TO authenticated
  USING (email = auth.jwt() ->> 'email');


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Course Catalog Policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read published courses" ON public.courses;
DROP POLICY IF EXISTS "Students can view enrolled courses" ON public.courses;
CREATE POLICY "students read published courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (published = true);


-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Syllabus Module & Lesson Policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read course_modules for enrolled courses" ON public.course_modules;
CREATE POLICY "students read course_modules for enrolled courses"
  ON public.course_modules FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.contacts ct ON e.contact_id = ct.id
    WHERE e.course_id = course_modules.course_id
    AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "students read course_lessons for enrolled courses" ON public.course_lessons;
CREATE POLICY "students read course_lessons for enrolled courses"
  ON public.course_lessons FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.contacts ct ON e.contact_id = ct.id
    WHERE e.course_id = course_lessons.course_id
    AND ct.email = auth.jwt() ->> 'email'
  ));


-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Quiz Questions & Settings Policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read quiz_questions for enrolled courses" ON public.quiz_questions;
CREATE POLICY "students read quiz_questions for enrolled courses"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.contacts ct ON e.contact_id = ct.id
    JOIN public.course_lessons cl ON cl.course_id = e.course_id
    WHERE cl.id = quiz_questions.lesson_id
    AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "students read quiz_settings for enrolled courses" ON public.quiz_settings;
CREATE POLICY "students read quiz_settings for enrolled courses"
  ON public.quiz_settings FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.contacts ct ON e.contact_id = ct.id
    JOIN public.course_lessons cl ON cl.course_id = e.course_id
    WHERE cl.id = quiz_settings.lesson_id
    AND ct.email = auth.jwt() ->> 'email'
  ));


-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Quiz Attempt Policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read own quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "students read own quiz_attempts"
  ON public.quiz_attempts FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = quiz_attempts.student_id
    AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "students insert own quiz_attempts" ON public.quiz_attempts;
CREATE POLICY "students insert own quiz_attempts"
  ON public.quiz_attempts FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = quiz_attempts.student_id
    AND ct.email = auth.jwt() ->> 'email'
  ));


-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Course Progress Overrides (Fixing auth.users reference issue)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read own course_progress" ON public.course_progress;
CREATE POLICY "students read own course_progress"
  ON public.course_progress FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = course_progress.contact_id
    AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "students insert own course_progress" ON public.course_progress;
CREATE POLICY "students insert own course_progress"
  ON public.course_progress FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = course_progress.contact_id
    AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "students delete own course_progress" ON public.course_progress;
CREATE POLICY "students delete own course_progress"
  ON public.course_progress FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = course_progress.contact_id
    AND ct.email = auth.jwt() ->> 'email'
  ));


-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Enrollments Overrides (Fixing auth.users reference issue)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "students read own enrollments" ON public.enrollments;
CREATE POLICY "students read own enrollments"
  ON public.enrollments FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = enrollments.contact_id
    AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "students self-register enrollments" ON public.enrollments;
CREATE POLICY "students self-register enrollments"
  ON public.enrollments FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = enrollments.contact_id
    AND ct.email = auth.jwt() ->> 'email'
  ));
