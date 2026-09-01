-- Module-Level Quiz (AUDIT-THEN-BUILD) — Step 1 schema decision.
--
-- Real audit finding: quiz_questions/quiz_settings' RLS policies hard-join through
-- lesson_id -> course_lessons directly in their USING clause (not a generic nullable-FK
-- pattern) — e.g. quiz_questions' "students read" policy is
--   EXISTS (SELECT 1 FROM enrollments e JOIN contacts ct ... JOIN course_lessons cl
--           ON cl.course_id = e.course_id WHERE cl.id = quiz_questions.lesson_id ...)
-- Extending those tables with a nullable module_id would require rewriting tested, working
-- RLS on the real lesson-quiz system just to special-case a second scope. Separate tables,
-- structurally mirroring the lesson-quiz ones column-for-column but scoped through
-- course_modules instead, avoid touching that working system at all — chosen per the master
-- prompt's own explicit "prefer (a) unless it would meaningfully complicate RLS" guidance,
-- which this real RLS shape does.

create table module_quiz_settings (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references course_modules(id) on delete cascade,
  time_limit_minutes integer,
  max_attempts integer default 3,
  pass_percentage integer default 70,
  show_answers_after text default 'submission' check (show_answers_after in ('submission', 'never', 'after_due')),
  randomize_questions boolean default false,
  publish_status text default 'draft' check (publish_status in ('active', 'draft', 'scheduled')),
  scheduled_at timestamptz,
  created_at timestamptz default now(),
  unique (module_id)
);

create table module_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references course_modules(id) on delete cascade,
  workspace_id uuid not null,
  question_type text not null check (question_type in ('mcq', 'true_false', 'short_answer', 'matching', 'ordering', 'fill_blank', 'code', 'file_upload')),
  question_text text not null,
  options jsonb default '[]'::jsonb,
  correct_answer jsonb,
  explanation text,
  points integer default 1,
  position integer default 0,
  created_at timestamptz default now()
);

create table module_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references course_modules(id) on delete cascade,
  student_id uuid not null,
  workspace_id uuid not null,
  answers jsonb default '{}'::jsonb,
  score integer,
  max_score integer,
  percentage numeric,
  passed boolean,
  time_taken_seconds integer,
  submitted_at timestamptz default now()
);

alter table module_quiz_settings enable row level security;
alter table module_quiz_questions enable row level security;
alter table module_quiz_attempts enable row level security;

-- module_quiz_settings: same two-policy shape as quiz_settings, joined via course_modules
-- instead of course_lessons.
create policy "students read module_quiz_settings for enrolled courses"
  on module_quiz_settings for select
  using (
    exists (
      select 1 from enrollments e
      join contacts ct on e.contact_id = ct.id
      join course_modules cm on cm.course_id = e.course_id
      where cm.id = module_quiz_settings.module_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "workspace members access module_quiz_settings"
  on module_quiz_settings for all
  using (
    module_id in (
      select id from course_modules
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

-- module_quiz_questions: same two-policy shape as quiz_questions.
create policy "students read module_quiz_questions for enrolled courses"
  on module_quiz_questions for select
  using (
    exists (
      select 1 from enrollments e
      join contacts ct on e.contact_id = ct.id
      join course_modules cm on cm.course_id = e.course_id
      where cm.id = module_quiz_questions.module_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "workspace members access module_quiz_questions"
  on module_quiz_questions for all
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

-- module_quiz_attempts: same two-policy shape as quiz_attempts.
create policy "students read own module_quiz_attempts"
  on module_quiz_attempts for select
  using (
    exists (
      select 1 from contacts ct
      where ct.id = module_quiz_attempts.student_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "workspace members access module_quiz_attempts"
  on module_quiz_attempts for all
  using (
    workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create index idx_module_quiz_questions_module_id on module_quiz_questions(module_id);
create index idx_module_quiz_attempts_module_id on module_quiz_attempts(module_id);
create index idx_module_quiz_attempts_student_id on module_quiz_attempts(student_id);
