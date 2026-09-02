-- Batch 2 (Missing Quiz Question Types) — Step 3, file_upload "pending manual review" path.
--
-- Behaviour change being made explicit: matching / ordering / fill_blank / code are fully
-- auto-graded (code by normalized-text match against accepted solutions, NOT execution), so a
-- quiz of those + the 3 existing types stays instant. A `file_upload` question cannot be
-- auto-scored — the student uploads a real file and an instructor grades it, exactly like the
-- existing Assignment flow (lms_assignment_submissions: grade_status pending/passed/failed +
-- feedback_comments + graded_by_user_id + graded_at). A quiz containing >= 1 file_upload
-- question is therefore NO LONGER a purely instant, fully-automated quiz: the attempt is held
-- in 'pending_review' until a human grades the upload(s), and only then does it get a real
-- pass/fail (and, for a lesson quiz, mark the lesson complete / fire quiz_passed|quiz_failed).
--
-- Rather than reuse lms_assignment_submissions (keyed unique(contact_id, lesson_id) — it would
-- collide with a real lesson assignment, and its rows aren't quiz attempts), the review state
-- lives on the attempt row itself, and the instructor grades from the SAME QuizAnalyticsConsole
-- they already use to review attempts.

alter table public.quiz_attempts
  add column if not exists grade_status text not null default 'auto'
    check (grade_status in ('auto', 'pending_review', 'reviewed')),
  add column if not exists auto_score integer,                 -- points from auto-graded questions only
  add column if not exists manual_points_awarded jsonb,        -- { "<question_id>": <points>, ... }
  add column if not exists reviewer_feedback text,
  add column if not exists graded_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists graded_at timestamptz;

alter table public.module_quiz_attempts
  add column if not exists grade_status text not null default 'auto'
    check (grade_status in ('auto', 'pending_review', 'reviewed')),
  add column if not exists auto_score integer,
  add column if not exists manual_points_awarded jsonb,
  add column if not exists reviewer_feedback text,
  add column if not exists graded_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists graded_at timestamptz;

comment on column public.quiz_attempts.grade_status is
  'auto = fully machine-graded (all prior attempts are this). pending_review = has >=1 file_upload answer awaiting an instructor. reviewed = an instructor has graded it; passed/score are now final.';
comment on column public.module_quiz_attempts.grade_status is 'See quiz_attempts.grade_status.';

-- Existing rows: default 'auto' is correct — every attempt written before this migration was
-- fully auto-graded. `passed` on a pending_review row is NULL until reviewed.
create index if not exists idx_quiz_attempts_pending_review
  on public.quiz_attempts (workspace_id) where grade_status = 'pending_review';
create index if not exists idx_module_quiz_attempts_pending_review
  on public.module_quiz_attempts (workspace_id) where grade_status = 'pending_review';
