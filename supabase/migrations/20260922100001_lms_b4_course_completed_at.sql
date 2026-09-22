-- LMS batch 4 / fix 3: `course_completed` used to fire on plain lesson-count equality, computed
-- separately from (and looser than) the real completion criteria the certificate route now
-- enforces (courseCompletion.ts, Batch 3 / fix 1: lesson+module quizzes, graded assignments,
-- draft/coming_soon/inactive exclusions). This column is the fire-once guard for the single
-- shared trigger point (maybeFireCourseCompleted) that now backs the event from every place
-- completion can be reached: lesson completion, a lesson- or module-quiz pass, or an assignment
-- graded 'passed' — not just lesson completion, since any of those can be the final missing piece.
-- Purely additive; every existing row starts NULL, so nothing fires retroactively — it fires the
-- next time a real completing action touches an enrollment already otherwise complete.
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS course_completed_at timestamptz;
