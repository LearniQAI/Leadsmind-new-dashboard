-- LMS batch 6 / Part 1: per-course strict completion mode. Default 'loose' — current behaviour
-- (confirmedOverride / allowIncomplete accepted) is fully unchanged for every existing course.
-- 'strict' disables the override for that course: every block must be genuinely completed.
-- Text + CHECK, matching this table's existing enum-style columns (pricing_model, start_method,
-- payment_failure_policy) rather than a native Postgres enum.
-- Data impact confirmed live before this shipped: 0 course_progress rows have EVER used
-- completion_override=true, on any course — flipping any course to strict today would not
-- invalidate a single existing student's recorded completion.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS completion_mode text NOT NULL DEFAULT 'loose'
    CHECK (completion_mode IN ('loose', 'strict'));
