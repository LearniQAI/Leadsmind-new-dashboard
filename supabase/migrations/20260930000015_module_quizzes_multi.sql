-- Multiple quizzes per module.
--
-- Before this, a module quiz had no identity of its own: module_quiz_questions and
-- module_quiz_attempts hung directly off module_id, and module_quiz_settings carried
-- UNIQUE (module_id). "The module's quiz" was the only quiz a module could have.
--
-- module_quizzes is the new parent: one row per quiz, with its own title and publish status.
-- Questions, settings and attempts gain quiz_id. module_id stays on every child table (the
-- existing RLS policies and indexes read it) and is kept consistent with the parent by a
-- composite FK (quiz_id, module_id) -> module_quizzes (id, module_id).
--
-- Product rules agreed for this change (2026-09-27):
--   * students see only quizzes with status = 'published' AND at least one question;
--   * course completion requires passing EVERY such quiz in each visible module.
-- New quizzes start as 'draft'. Every quiz backfilled here is 'published', because each one is
-- visible to students today (the old rule was "the module has questions", status ignored).
--
-- Attempts keep their history if a quiz is deleted: quiz_id is set NULL, module_id is kept.

create table public.module_quizzes (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  status text not null default 'draft' check (status in ('draft', 'published')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, module_id)
);

create index idx_module_quizzes_module_id on public.module_quizzes (module_id, position);

alter table public.module_quizzes enable row level security;

-- Same policy shape as module_quiz_questions: workspace members (permissive), then the LMS
-- instructor-role gate and the Learning module-permission gate (both restrictive). Students
-- never read this table with their own JWT; the student pages use the service role.
create policy "workspace members access module_quizzes"
  on public.module_quizzes for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy lms_role_gate_ins on public.module_quizzes as restrictive for insert to authenticated
  with check (public.lms_member_role_ok(workspace_id));
create policy lms_role_gate_upd on public.module_quizzes as restrictive for update to authenticated
  using (public.lms_member_role_ok(workspace_id)) with check (public.lms_member_role_ok(workspace_id));
create policy lms_role_gate_del on public.module_quizzes as restrictive for delete to authenticated
  using (public.lms_member_role_ok(workspace_id));

create policy module_access on public.module_quizzes as restrictive for all to authenticated
  using (not coalesce(workspace_id = any ((select public.module_denied_workspaces('{learning}'::text[]))::uuid[]), false))
  with check (not coalesce(workspace_id = any ((select public.module_denied_workspaces('{learning}'::text[]))::uuid[]), false));

revoke all on public.module_quizzes from anon;

-- 1. One quiz per module that has any quiz data today. Title matches what instructors and
--    students already saw ("{module title} Quiz").
insert into public.module_quizzes (module_id, workspace_id, title, status, position, created_at)
select m.id,
       m.workspace_id,
       coalesce(nullif(btrim(m.title), ''), 'Module') || ' Quiz',
       'published',
       0,
       coalesce(s.created_at, q.first_created, now())
from public.course_modules m
left join public.module_quiz_settings s on s.module_id = m.id
left join (
  select module_id, min(created_at) as first_created
  from public.module_quiz_questions group by module_id
) q on q.module_id = m.id
where m.id in (
  select module_id from public.module_quiz_settings
  union select module_id from public.module_quiz_questions
  union select module_id from public.module_quiz_attempts where module_id is not null
);

-- 2. quiz_id on the children, backfilled from module_id (exactly one quiz per module so far).
alter table public.module_quiz_settings add column quiz_id uuid;
alter table public.module_quiz_questions add column quiz_id uuid;
alter table public.module_quiz_attempts add column quiz_id uuid;

update public.module_quiz_settings c set quiz_id = mq.id from public.module_quizzes mq where mq.module_id = c.module_id;
update public.module_quiz_questions c set quiz_id = mq.id from public.module_quizzes mq where mq.module_id = c.module_id;
update public.module_quiz_attempts c set quiz_id = mq.id from public.module_quizzes mq where mq.module_id = c.module_id;

alter table public.module_quiz_settings alter column quiz_id set not null;
alter table public.module_quiz_questions alter column quiz_id set not null;

-- 3. Settings become one row per quiz instead of one per module.
alter table public.module_quiz_settings drop constraint module_quiz_settings_module_id_key;
alter table public.module_quiz_settings add constraint module_quiz_settings_quiz_id_key unique (quiz_id);

alter table public.module_quiz_settings
  add constraint module_quiz_settings_quiz_fkey
  foreign key (quiz_id, module_id) references public.module_quizzes (id, module_id) on delete cascade;

alter table public.module_quiz_questions
  add constraint module_quiz_questions_quiz_fkey
  foreign key (quiz_id, module_id) references public.module_quizzes (id, module_id) on delete cascade;

-- Attempts are history: deleting a quiz nulls quiz_id only (module_id is kept).
alter table public.module_quiz_attempts
  add constraint module_quiz_attempts_quiz_fkey
  foreign key (quiz_id, module_id) references public.module_quizzes (id, module_id) on delete set null (quiz_id);

create index idx_module_quiz_questions_quiz_id on public.module_quiz_questions (quiz_id, position);
create index idx_module_quiz_attempts_quiz_student on public.module_quiz_attempts (quiz_id, student_id);

-- settings.publish_status is no longer read for module quizzes; module_quizzes.status is the
-- source of truth.
comment on column public.module_quiz_settings.publish_status is
  'Unused since 20260930000015: module_quizzes.status is the publish state of a module quiz.';
