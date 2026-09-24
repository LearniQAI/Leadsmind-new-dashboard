-- LMS Video: Google Drive link as a sixth video provider ('gdrive'), alongside youtube / vimeo /
-- wistia / bunny / aws. A Drive video plays as a real <video> element through an access-gated,
-- same-origin streaming proxy (GET /api/video/[id]/stream), mirroring the audio feature's
-- Drive pipeline — but with three deliberate differences from audio_assets, each fixing a problem
-- the audio work hit later:
--
-- 1. NO student/anon SELECT policy. audio_assets' "allow_public_select_*_published_courses" policy
--    lets the anon key read share_url for any published course, which bypasses the enrolment gate
--    on the stream proxy entirely (live-proven in the 2026-09-23 audio audit). Nothing
--    student-side needs to read this table: the student player only needs the asset id, which is
--    on content_blocks, and the stream route reads video_assets with the service role. Only
--    workspace members can see it.
-- 2. A direct workspace_id (FK, ON DELETE CASCADE) rather than ownership derived through an
--    attachment join. One validated Drive file per workspace (unique on workspace_id +
--    google_drive_file_id) is what makes reuse real — pasting the same link into a second lesson
--    reuses the row — and re-validating a broken link updates that same row instead of leaving an
--    orphan 'broken' row per attempt (another audio audit finding).
-- 3. The block -> asset link is a real FK column, content_blocks.video_asset_id, NOT a key in the
--    content jsonb: the canvas block editors rewrite `content` from a stale client-side spread,
--    which would silently drop it (the same reason audio artwork became a real column). The PATCH
--    /api/lms/content-blocks/[id] route never writes this column; only the server-side validate
--    route does.
--
-- courseCompletion.ts needs no change: Drive video completion is the same
-- recordBlockCompletion -> lesson_block_completions write every other video provider uses.

create table video_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  google_drive_file_id text not null,
  share_url text not null,
  filename text,
  mime_type text,
  size_bytes bigint,
  duration_seconds numeric,
  width integer,
  height integer,
  status text not null default 'pending' check (status in ('pending', 'ready', 'broken')),
  last_validation_error text,
  last_validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, google_drive_file_id)
);
create index idx_video_assets_workspace on video_assets(workspace_id);

alter table video_assets enable row level security;

create policy "workspace members access video_assets"
  on video_assets
  for all
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = video_assets.workspace_id
        and wm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = video_assets.workspace_id
        and wm.user_id = auth.uid()
    )
  );

-- Batch 3 instructor role gate, same declarative shape as every other lms_role_gate_* policy.
create policy lms_role_gate_ins on video_assets as restrictive for insert to authenticated
  with check (public.lms_member_role_ok(workspace_id));
create policy lms_role_gate_upd on video_assets as restrictive for update to authenticated
  using (public.lms_member_role_ok(workspace_id)) with check (public.lms_member_role_ok(workspace_id));
create policy lms_role_gate_del on video_assets as restrictive for delete to authenticated
  using (public.lms_member_role_ok(workspace_id));

alter table content_blocks
  add column video_asset_id uuid references video_assets(id) on delete set null;
create index idx_content_blocks_video_asset on content_blocks(video_asset_id) where video_asset_id is not null;

alter table content_blocks drop constraint content_blocks_video_provider_check;
alter table content_blocks add constraint content_blocks_video_provider_check check (
  video_provider in ('youtube', 'vimeo', 'wistia', 'bunny', 'aws', 'gdrive')
  or video_provider is null
);
