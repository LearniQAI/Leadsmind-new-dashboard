-- LMS Audio Phase 4: public podcast distribution (RSS + public episode/show pages).
--
-- Architecture note (resolved before writing this, see phase report): podcast_episodes
-- references audio_assets DIRECTLY (audio_asset_id), NOT through audio_asset_attachments.
-- The spec asked for the attachment table, but also requires episodes with no course lesson at
-- all — audio_asset_attachments.content_block_id is NOT NULL and every content_block requires a
-- real lesson/course, so a podcast-only episode has nowhere to attach. Referencing audio_assets
-- directly still fully delivers "one audio file, many uses" (the same asset reachable via a
-- lesson attachment AND a podcast episode at once) and has a security benefit: the public
-- podcast path never joins through content_blocks/course_lessons/courses/enrollments at all,
-- so course/paid-content data is structurally unreachable from it, not just carefully filtered
-- out.
--
-- source_content_block_id is optional provenance (populated only when an episode was created by
-- reusing an existing course-lesson attachment) — used solely to pull real audio_chapters into
-- the public page/feed for that case. NULL for podcast-only episodes (no chapters this phase).

create table podcast_shows (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  title text not null,
  slug text not null unique,
  description text,
  artwork_url text,
  owner_name text not null,
  owner_email text not null,
  -- Apple Podcasts' real top-level taxonomy (Podcasts Connect / RSS spec) — directories validate
  -- against this exact list, so it's a real check constraint, not free text.
  category text not null check (category in (
    'Arts', 'Business', 'Comedy', 'Education', 'Fiction', 'Government', 'History',
    'Health & Fitness', 'Kids & Family', 'Leisure', 'Music', 'News', 'Religion & Spirituality',
    'Science', 'Society & Culture', 'Sports', 'Technology', 'True Crime', 'TV & Film'
  )),
  explicit boolean not null default false,
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_podcast_shows_workspace on podcast_shows(workspace_id);

alter table podcast_shows enable row level security;

create policy "workspace members access podcast_shows"
  on podcast_shows
  for all
  to public
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = podcast_shows.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Show metadata (title/description/artwork/category) is not sensitive on its own — the public
-- feed and show page both need to read it anonymously. The real gate is at the EPISODE level.
create policy "public reads podcast_shows"
  on podcast_shows
  for select
  to anon, authenticated
  using (true);

create table podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  podcast_show_id uuid not null references podcast_shows(id) on delete cascade,
  audio_asset_id uuid not null references audio_assets(id) on delete restrict,
  source_content_block_id uuid references content_blocks(id) on delete set null,
  title text not null,
  description text,
  episode_number integer,
  season_number integer,
  slug text not null,
  publish_at timestamptz not null default now(),
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (podcast_show_id, slug)
);
create index idx_podcast_episodes_show on podcast_episodes(podcast_show_id);
create index idx_podcast_episodes_audio_asset on podcast_episodes(audio_asset_id);
-- The exact predicate the public feed/page/stream routes filter on — an index that matches it
-- keeps "is this live" cheap regardless of how large a show's episode list gets.
create index idx_podcast_episodes_public on podcast_episodes(podcast_show_id, status, publish_at);

alter table podcast_episodes enable row level security;

create policy "workspace members access podcast_episodes"
  on podcast_episodes
  for all
  to public
  using (
    exists (
      select 1
      from podcast_shows ps
      join workspace_members wm on wm.workspace_id = ps.workspace_id
      where ps.id = podcast_episodes.podcast_show_id
        and wm.user_id = auth.uid()
    )
  );

-- THE security predicate for this entire phase: public (anon) read access exists if and only if
-- status = 'published' AND publish_at has passed. Nothing else — no course/enrollment check is
-- possible here because nothing here references course tables at all.
create policy "public reads live podcast_episodes"
  on podcast_episodes
  for select
  to anon, authenticated
  using (status = 'published' and publish_at <= now());

-- Batch 3 instructor role gate, same pattern as every other LMS admin table.
DO $$
DECLARE
  spec text[][] := ARRAY[
    ['podcast_shows',    'workspace_id', 'n'],
    ['podcast_episodes', '(SELECT ps.workspace_id FROM public.podcast_shows ps WHERE ps.id = podcast_show_id)', 'n']
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
