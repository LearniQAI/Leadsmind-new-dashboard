-- Module-level default settings for module quizzes.
--
-- A module can hold several quizzes (module_quizzes). Each used to carry its own, fully
-- independent module_quiz_settings row, so the same grading/pacing rules had to be repeated on
-- every quiz. module_quiz_defaults holds ONE row per module: the rules a quiz uses unless it opts
-- out. Precedence (module default, per-quiz override):
--   * module_quiz_settings.inherit_module_defaults = true  -> the quiz uses the module's values;
--   * false (the default for every existing row)           -> the quiz keeps its own saved values.
-- Existing quizzes therefore keep their customisations untouched; nothing is rewritten here.
-- A quiz with no settings row at all follows the module defaults (or the built-in defaults when
-- the module has none).
--
-- Fields mirrored are exactly the ones the student side enforces: pass mark, time limit, attempt
-- cap, question shuffling, and whether the quiz gates course completion.

create table public.module_quiz_defaults (
  module_id uuid primary key references public.course_modules(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  pass_percentage integer not null default 70 check (pass_percentage between 0 and 100),
  time_limit_minutes integer check (time_limit_minutes is null or time_limit_minutes >= 0),
  max_attempts integer not null default -1 check (max_attempts = -1 or max_attempts >= 1),
  randomize_questions boolean not null default false,
  is_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.module_quiz_defaults enable row level security;

-- Same policy shape as module_quizzes: workspace members (permissive), then the LMS role gate and
-- the Learning module-permission gate (restrictive). Students never read this table with their own
-- JWT; the student pages and actions use the service role.
create policy "workspace members access module_quiz_defaults"
  on public.module_quiz_defaults for all to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()));

create policy lms_role_gate_ins on public.module_quiz_defaults as restrictive for insert to authenticated
  with check (public.lms_member_role_ok(workspace_id));
create policy lms_role_gate_upd on public.module_quiz_defaults as restrictive for update to authenticated
  using (public.lms_member_role_ok(workspace_id)) with check (public.lms_member_role_ok(workspace_id));
create policy lms_role_gate_del on public.module_quiz_defaults as restrictive for delete to authenticated
  using (public.lms_member_role_ok(workspace_id));

create policy module_access on public.module_quiz_defaults as restrictive for all to authenticated
  using (not coalesce(workspace_id = any ((select public.module_denied_workspaces('{learning}'::text[]))::uuid[]), false))
  with check (not coalesce(workspace_id = any ((select public.module_denied_workspaces('{learning}'::text[]))::uuid[]), false));

revoke all on public.module_quiz_defaults from anon;

-- Per-quiz side: the opt-in flag, and "required for completion" (the builder toggle that was
-- never persisted). Both additive; existing rows read inherit=false / required=true, i.e. exactly
-- today's behaviour.
alter table public.module_quiz_settings
  add column inherit_module_defaults boolean not null default false,
  add column is_required boolean not null default true;
