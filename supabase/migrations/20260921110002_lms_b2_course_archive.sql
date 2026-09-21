-- LMS batch 2 / fix 6: courses are archived (status = 'archived', published = false, archived_at set)
-- instead of hard-deleted once they have any enrolment or issued certificate. courses -> enrollments,
-- course_progress and course_certificates are all ON DELETE CASCADE, so a hard delete destroyed
-- paid students' history and broke public certificate-verification links.
-- Purely additive: no existing row is touched. Rollback: ALTER TABLE public.courses DROP COLUMN archived_at;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS archived_at timestamptz;
