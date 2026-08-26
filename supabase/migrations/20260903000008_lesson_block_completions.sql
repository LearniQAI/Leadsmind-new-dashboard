-- Phase C, Step 1: per-block completion tracking (closes the "Next advances with zero
-- interaction" loophole confirmed live in Phase C Step 0).

-- Assignment blocks gate on real submission (existing grading is asynchronous/staff-driven;
-- gating the Next button on staff having graded yet would stall the whole course), which
-- none of the 4 existing completion_rule values cleanly express.
alter table content_blocks drop constraint content_blocks_completion_rule_check;
alter table content_blocks add constraint content_blocks_completion_rule_check
  check (completion_rule in ('watched_threshold', 'opened', 'quiz_passed', 'submitted', 'none'));

create table lesson_block_completions (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null references content_blocks(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  completed_at timestamptz not null default now(),
  metric jsonb default '{}'::jsonb,
  unique (content_block_id, contact_id)
);
create index idx_lesson_block_completions_block on lesson_block_completions(content_block_id);
create index idx_lesson_block_completions_contact on lesson_block_completions(contact_id);

alter table lesson_block_completions enable row level security;

-- Mirrors the real workspace-scoping pattern from content_blocks (Phase A): resolved by
-- joining content_block_id -> course_lessons.workspace_id, since this table has no direct
-- workspace_id column either.
create policy "workspace members read lesson_block_completions"
  on lesson_block_completions
  for select
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = lesson_block_completions.content_block_id
        and wm.user_id = auth.uid()
    )
  );

-- Students may only ever see/manage their own completion rows (matched via their own
-- contact record's email, same join pattern as the existing "students read course_lessons
-- for enrolled courses" policy).
create policy "students manage their own lesson_block_completions"
  on lesson_block_completions
  for all
  to authenticated
  using (
    exists (
      select 1 from contacts ct
      where ct.id = lesson_block_completions.contact_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );
