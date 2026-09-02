-- Reading-completion tracking for canvas lessons made ENTIRELY of inline content
-- (heading / rich-text / image nodes) with zero trackable block/contentbox nodes.
--
-- Gap this closes: getBlockIdsForLesson() returns [] for such a lesson, so both
-- markLessonCompleteForContact and getLessonBlockCompletionStatus treated it as
-- "nothing to check -> completable the instant it loads" — a student could mark a
-- text-only article lesson complete having read none of it. This is the inline-content
-- analogue of lesson_block_completions (Phase C, migration ...08): one row per
-- (lesson, student) recording that the student scrolled through the full rendered
-- article AND dwelled on it for at least the server-recomputed minimum (derived from the
-- lesson's own word count — the client cannot lower that floor).
--
-- Scoped deliberately: this gate applies ONLY when a canvas lesson has zero trackable
-- blocks. A lesson that has real block/contentbox nodes keeps its existing block gate
-- unchanged, with no added reading requirement.

create table lesson_reading_completions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  dwell_seconds integer not null default 0,
  scrolled boolean not null default false,
  metric jsonb default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  unique (lesson_id, contact_id)
);
create index idx_lesson_reading_completions_lesson on lesson_reading_completions(lesson_id);
create index idx_lesson_reading_completions_contact on lesson_reading_completions(contact_id);

alter table lesson_reading_completions enable row level security;

-- Same workspace-scoping shape as lesson_block_completions: resolved by joining
-- lesson_id -> course_lessons.workspace_id (no direct workspace_id column here either).
create policy "workspace members read lesson_reading_completions"
  on lesson_reading_completions
  for select
  to public
  using (
    exists (
      select 1
      from course_lessons cl
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cl.id = lesson_reading_completions.lesson_id
        and wm.user_id = auth.uid()
    )
  );

-- Students may only ever see/manage their own rows (matched via their own contact
-- record's email — identical pattern to lesson_block_completions).
create policy "students manage their own lesson_reading_completions"
  on lesson_reading_completions
  for all
  to authenticated
  using (
    exists (
      select 1 from contacts ct
      where ct.id = lesson_reading_completions.contact_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );
