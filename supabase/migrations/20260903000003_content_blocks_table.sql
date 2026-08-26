-- Phase A, Migration 1: content_blocks table (generic ordered content-block-per-lesson model)
create table content_blocks (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references course_lessons(id) on delete cascade,
  position integer not null default 0,
  type text not null check (type in (
    'video','audio','reading','rich_text','quiz','assignment',
    'flashcards','download','slides','embed','live_session'
  )),
  video_provider text check (
    video_provider in ('youtube','vimeo','wistia','bunny','aws')
    or video_provider is null
  ),
  file_url text,
  completion_rule text not null default 'none' check (completion_rule in (
    'watched_threshold','opened','quiz_passed','none'
  )),
  completion_threshold numeric,
  content jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_content_blocks_lesson on content_blocks(lesson_id, position);

alter table content_blocks enable row level security;

-- Mirrors "workspace members access course_lessons" (ALL, role public, workspace_id IN
-- workspace_members for auth.uid()) joined through lesson_id since content_blocks has
-- no direct workspace_id column.
create policy "workspace members access content_blocks"
  on content_blocks
  for all
  to public
  using (
    exists (
      select 1
      from course_lessons cl
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cl.id = content_blocks.lesson_id
        and wm.user_id = auth.uid()
    )
  );

-- Mirrors "students read course_lessons for enrolled courses" (SELECT, role authenticated).
create policy "students read content_blocks for enrolled courses"
  on content_blocks
  for select
  to authenticated
  using (
    exists (
      select 1
      from course_lessons cl
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cl.id = content_blocks.lesson_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

-- Mirrors "allow_public_select_lessons_published_courses" (SELECT, roles anon,authenticated).
create policy "allow_public_select_content_blocks_published_courses"
  on content_blocks
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from course_lessons cl
      join courses c on c.id = cl.course_id
      where cl.id = content_blocks.lesson_id
        and (c.published = true or c.status = 'published')
    )
  );
