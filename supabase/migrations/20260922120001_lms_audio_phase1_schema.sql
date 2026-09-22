-- LMS Audio feature, Phase 1: data model for the Google-Drive-link-based "drive" mode of the
-- EXISTING content_blocks.type = 'audio' block (see AudioBlockEditor.tsx — 'upload' and 'embed'
-- modes already exist and are untouched by this migration). No new content_blocks.type value;
-- a drive-mode audio block sets content.mode = 'drive' and content.audio_asset_id, mirroring the
-- existing mode discriminator convention.
--
-- Workspace-scoping convention (confirmed from content_blocks / lesson_block_completions /
-- flashcard_reviews): a table hanging off one content_block gets NO direct workspace_id column —
-- RLS resolves it by joining content_block_id -> course_lessons.workspace_id, same as those
-- three tables and the Batch 3 lms_role_gate_* policies already do. `speakers` is the one
-- exception: it's a reusable workspace-level roster (like lms_expert_profiles), not scoped to a
-- single block, so it gets a direct workspace_id column.

-- ---------------------------------------------------------------------------------------------
-- audio_assets: one row per validated Google Drive audio file, one-to-one with the content_block
-- that owns it (a drive-mode audio block always has exactly one asset).
-- ---------------------------------------------------------------------------------------------
create table audio_assets (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null unique references content_blocks(id) on delete cascade,
  google_drive_file_id text not null,
  share_url text not null,
  filename text,
  mime_type text,
  duration_seconds numeric,
  size_bytes bigint,
  status text not null default 'pending' check (status in ('pending', 'ready', 'broken')),
  last_validation_error text,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_audio_assets_content_block on audio_assets(content_block_id);

alter table audio_assets enable row level security;

create policy "workspace members access audio_assets"
  on audio_assets
  for all
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = audio_assets.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students read audio_assets for enrolled courses"
  on audio_assets
  for select
  to authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cb.id = audio_assets.content_block_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_audio_assets_published_courses"
  on audio_assets
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where cb.id = audio_assets.content_block_id
        and (c.published = true or c.status = 'published')
    )
  );

-- ---------------------------------------------------------------------------------------------
-- speakers: reusable workspace-level roster (mirrors lms_expert_profiles' direct workspace_id).
-- ---------------------------------------------------------------------------------------------
create table speakers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  name text not null,
  display_name text,
  role text,
  bio text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_speakers_workspace on speakers(workspace_id);

alter table speakers enable row level security;

create policy "workspace members access speakers"
  on speakers
  for all
  to public
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = speakers.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Note: "students/public read speakers" policies are defined further below, right after
-- audio_lesson_speakers is created — they join through that table, which doesn't exist yet here.

-- ---------------------------------------------------------------------------------------------
-- audio_lesson_speakers: join table, drive-mode audio block <-> speaker.
-- ---------------------------------------------------------------------------------------------
create table audio_lesson_speakers (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null references content_blocks(id) on delete cascade,
  speaker_id uuid not null references speakers(id) on delete cascade,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (content_block_id, speaker_id)
);
create index idx_audio_lesson_speakers_block on audio_lesson_speakers(content_block_id, display_order);

alter table audio_lesson_speakers enable row level security;

create policy "workspace members access audio_lesson_speakers"
  on audio_lesson_speakers
  for all
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = audio_lesson_speakers.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students read audio_lesson_speakers for enrolled courses"
  on audio_lesson_speakers
  for select
  to authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cb.id = audio_lesson_speakers.content_block_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_audio_lesson_speakers_published_courses"
  on audio_lesson_speakers
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where cb.id = audio_lesson_speakers.content_block_id
        and (c.published = true or c.status = 'published')
    )
  );

-- Deferred from the speakers table block above (needs audio_lesson_speakers to exist).
create policy "students read speakers for enrolled courses"
  on speakers
  for select
  to authenticated
  using (
    exists (
      select 1
      from audio_lesson_speakers als
      join content_blocks cb on cb.id = als.content_block_id
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where als.speaker_id = speakers.id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_speakers_published_courses"
  on speakers
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from audio_lesson_speakers als
      join content_blocks cb on cb.id = als.content_block_id
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where als.speaker_id = speakers.id
        and (c.published = true or c.status = 'published')
    )
  );

-- ---------------------------------------------------------------------------------------------
-- audio_speaker_segments: drives active-speaker highlighting in Phase 3. Not read anywhere yet
-- this phase, but captured now since the lesson builder UI built in this phase is what records it.
-- ---------------------------------------------------------------------------------------------
create table audio_speaker_segments (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null references content_blocks(id) on delete cascade,
  speaker_id uuid references speakers(id) on delete set null,
  start_time_ms integer not null,
  end_time_ms integer not null,
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  check (end_time_ms > start_time_ms)
);
create index idx_audio_speaker_segments_block on audio_speaker_segments(content_block_id, sequence);

alter table audio_speaker_segments enable row level security;

create policy "workspace members access audio_speaker_segments"
  on audio_speaker_segments
  for all
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = audio_speaker_segments.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students read audio_speaker_segments for enrolled courses"
  on audio_speaker_segments
  for select
  to authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cb.id = audio_speaker_segments.content_block_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_audio_speaker_segments_published_courses"
  on audio_speaker_segments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where cb.id = audio_speaker_segments.content_block_id
        and (c.published = true or c.status = 'published')
    )
  );

-- ---------------------------------------------------------------------------------------------
-- transcript_segments
-- ---------------------------------------------------------------------------------------------
create table transcript_segments (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null references content_blocks(id) on delete cascade,
  speaker_id uuid references speakers(id) on delete set null,
  start_time_ms integer not null,
  end_time_ms integer not null,
  text text not null,
  sequence integer not null default 0,
  created_at timestamptz not null default now(),
  check (end_time_ms > start_time_ms)
);
create index idx_transcript_segments_block on transcript_segments(content_block_id, sequence);

alter table transcript_segments enable row level security;

create policy "workspace members access transcript_segments"
  on transcript_segments
  for all
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = transcript_segments.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students read transcript_segments for enrolled courses"
  on transcript_segments
  for select
  to authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cb.id = transcript_segments.content_block_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_transcript_segments_published_courses"
  on transcript_segments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where cb.id = transcript_segments.content_block_id
        and (c.published = true or c.status = 'published')
    )
  );

-- ---------------------------------------------------------------------------------------------
-- audio_chapters
-- ---------------------------------------------------------------------------------------------
create table audio_chapters (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null references content_blocks(id) on delete cascade,
  title text not null,
  start_time_ms integer not null,
  end_time_ms integer not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (end_time_ms > start_time_ms)
);
create index idx_audio_chapters_block on audio_chapters(content_block_id, display_order);

alter table audio_chapters enable row level security;

create policy "workspace members access audio_chapters"
  on audio_chapters
  for all
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = audio_chapters.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students read audio_chapters for enrolled courses"
  on audio_chapters
  for select
  to authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cb.id = audio_chapters.content_block_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_audio_chapters_published_courses"
  on audio_chapters
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where cb.id = audio_chapters.content_block_id
        and (c.published = true or c.status = 'published')
    )
  );

-- ---------------------------------------------------------------------------------------------
-- audio_progress: per-student resume position / listened-percentage. This is a RESUME +
-- ANALYTICS table, not a second completion source of truth — the real completion write still
-- goes through recordBlockCompletion() -> lesson_block_completions exactly as it already does for
-- upload/embed-mode audio and video, so courseCompletion.ts needs no changes at all for this
-- feature. `completed` here just denormalizes that same signal for the admin analytics view.
-- Mirrors lesson_block_completions' shape (content_block_id, contact_id) unique pair.
-- ---------------------------------------------------------------------------------------------
create table audio_progress (
  id uuid primary key default gen_random_uuid(),
  content_block_id uuid not null references content_blocks(id) on delete cascade,
  contact_id uuid not null references contacts(id) on delete cascade,
  position_seconds numeric not null default 0,
  completion_percentage numeric not null default 0,
  completed boolean not null default false,
  last_played_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_block_id, contact_id)
);
create index idx_audio_progress_block on audio_progress(content_block_id);
create index idx_audio_progress_contact on audio_progress(contact_id);

alter table audio_progress enable row level security;

-- Mirrors lesson_block_completions: workspace members READ (analytics), students manage only
-- their own row (matched via their own contact record's email).
create policy "workspace members read audio_progress"
  on audio_progress
  for select
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = audio_progress.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students manage their own audio_progress"
  on audio_progress
  for all
  to authenticated
  using (
    exists (
      select 1 from contacts ct
      where ct.id = audio_progress.contact_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

-- ---------------------------------------------------------------------------------------------
-- Extend the Batch 3 instructor role gate (lms_role_gate_*) to the 6 instructor-managed tables
-- above, same declarative pattern as the original migration. audio_progress is deliberately
-- OMITTED here — it's student-written (like lesson_block_completions, also omitted from the
-- original spec), not instructor-managed content.
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
  spec text[][] := ARRAY[
    ['audio_assets',            '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n'],
    ['speakers',                'workspace_id', 'n'],
    ['audio_lesson_speakers',   '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n'],
    ['audio_speaker_segments',  '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n'],
    ['transcript_segments',     '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n'],
    ['audio_chapters',          '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n']
  ];
  i int;
  t text; e text; sel text; chk text;
BEGIN
  FOR i IN 1 .. array_length(spec, 1) LOOP
    t := spec[i][1]; e := spec[i][2]; sel := spec[i][3];
    chk := format('public.lms_member_role_ok(%s)', e);

    EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_ins ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_upd ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_del ON public.%I', t);
    EXECUTE format('CREATE POLICY lms_role_gate_ins ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (%s)', t, chk);
    EXECUTE format('CREATE POLICY lms_role_gate_upd ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', t, chk, chk);
    EXECUTE format('CREATE POLICY lms_role_gate_del ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (%s)', t, chk);

    IF sel = 'y' THEN
      EXECUTE format('DROP POLICY IF EXISTS lms_role_gate_sel ON public.%I', t);
      EXECUTE format('CREATE POLICY lms_role_gate_sel ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (%s)', t, chk);
    END IF;
  END LOOP;
END $$;
