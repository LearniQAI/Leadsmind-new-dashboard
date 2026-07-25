-- Task: enrollments / quiz_attempts / course_progress had client-INSERT RLS policies that
-- only verified row OWNERSHIP (contact_id/student_id matches the caller's own contact record),
-- never row VALIDITY. A logged-in student could call the Supabase client SDK directly to:
--   - insert into enrollments for any paid course, with no matching paid invoice
--     (bypassing enrollStudent()'s paid-invoice gate entirely)
--   - insert into quiz_attempts with passed:true / score:100, with no real answers graded
--     (bypassing gradeQuizAttempt()'s server-side grading entirely)
--   - insert into course_progress for any lesson, with no completed quiz
--     (bypassing markLessonComplete()'s pass-gate entirely)
-- These fake course_progress rows alone are sufficient to obtain a real completion
-- certificate from /api/student/courses/[id]/certificate, which counts progress rows only.
--
-- This is the same root-cause bug class already fixed once for ai_usage_credits in
-- 20260722000002_lock_down_ai_usage_credits_writes.sql: remove the permissive client-INSERT
-- policy and require all writes to route through the existing server actions, which already
-- perform the real validation (paid-invoice check, server-side grading) and already use
-- createAdminClient() (service-role, RLS-bypassing) for their actual writes.
--
-- Read/select access for students to their own rows is preserved unchanged — only the
-- self-service INSERT policies (the ones with no validity check) are removed.

-- enrollments: remove the ownership-only self-registration INSERT policy. No replacement —
-- RLS defaults to deny for INSERT with no matching policy. All enrollment creation must now
-- go through enrollStudent() (paid-invoice gated), the PayFast/Stripe webhook handlers, or the
-- workspace-automation lms_enroll() action — all of which already use the service-role client.
DROP POLICY IF EXISTS "students self-register enrollments" ON public.enrollments;

-- quiz_attempts: remove the ownership-only self-insert policy. No replacement — all quiz
-- attempts must now go through submitQuizAttempt(), which recomputes score/passed server-side
-- from the real quiz_questions data before writing, using the service-role client.
DROP POLICY IF EXISTS "students insert own quiz_attempts" ON public.quiz_attempts;

-- course_progress: remove the ownership-only self-insert policy. No replacement — all lesson
-- completion must now go through markLessonComplete() (or the remedial-assignment /
-- enrolment-activity routes, which validate ownership and pass status before writing), using
-- the service-role client.
DROP POLICY IF EXISTS "students insert own course_progress" ON public.course_progress;

-- Read (SELECT) access for students to their own rows, the workspace-member "FOR ALL" staff
-- management policies, and the student's own DELETE-own-course_progress policy are all left
-- untouched — this migration only removes the three ownership-only INSERT policies above.
