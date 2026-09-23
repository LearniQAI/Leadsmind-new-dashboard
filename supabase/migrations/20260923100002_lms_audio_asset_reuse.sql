-- LMS Audio: real "one audio file, many uses" (Pre-Phase-4 cleanup, confirmed decision).
--
-- Phase 1's audio_assets.content_block_id was NOT NULL UNIQUE — a hard 1:1. Just dropping the
-- UNIQUE constraint would leave content_block_id shaped like a "primary owner" column pointing
-- at one arbitrary block while other blocks silently referenced the same asset id from their own
-- content jsonb — a real ambiguity, not a fix. The correct structural change is a join table:
-- one audio_assets row (the validated Drive file + its metadata) can now be attached to many
-- content_blocks via audio_asset_attachments, each attachment still 1:1 from the BLOCK's side
-- (a block plays exactly one asset — content_block_id stays UNIQUE on the join table) while the
-- ASSET's side becomes genuinely 1:many.
--
-- This is a real access-control consequence, not just a data-modeling one: the streaming route
-- (GET /api/audio/[id]/stream) used to derive course/workspace/enrollment straight from
-- audio_assets.content_block_id. With one asset attachable to blocks in different lessons (and
-- in principle different courses), the stream request must now say WHICH content_block it's
-- playing through — see the accompanying route.ts change requiring ?contentBlockId=.
--
-- No-op for existing data: every current audio_assets row has exactly one content_block_id, so
-- the backfill below produces exactly one attachment row per existing asset — identical
-- real-world behavior until an admin deliberately reuses one.

create table audio_asset_attachments (
  id uuid primary key default gen_random_uuid(),
  audio_asset_id uuid not null references audio_assets(id) on delete cascade,
  content_block_id uuid not null unique references content_blocks(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index idx_audio_asset_attachments_asset on audio_asset_attachments(audio_asset_id);

-- Backfill: one attachment per existing (already 1:1) asset.
insert into audio_asset_attachments (audio_asset_id, content_block_id)
select id, content_block_id from audio_assets where content_block_id is not null;

alter table audio_asset_attachments enable row level security;

create policy "workspace members access audio_asset_attachments"
  on audio_asset_attachments
  for all
  to public
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where cb.id = audio_asset_attachments.content_block_id
        and wm.user_id = auth.uid()
    )
  );

create policy "students read audio_asset_attachments for enrolled courses"
  on audio_asset_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where cb.id = audio_asset_attachments.content_block_id
        and ct.email = (auth.jwt() ->> 'email')
    )
  );

create policy "allow_public_select_audio_asset_attachments_published_courses"
  on audio_asset_attachments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from content_blocks cb
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where cb.id = audio_asset_attachments.content_block_id
        and (c.published = true or c.status = 'published')
    )
  );

-- Drop the old direct FK + its policies (they referenced audio_assets.content_block_id, which is
-- about to go away) and replace with policies resolved through the new join table instead — any
-- one of the asset's real attachments being in the caller's workspace is sufficient, matching
-- the "reusable within one workspace" reality (a Drive link an instructor pasted belongs to their
-- own workspace; nothing here spans workspaces).
drop policy if exists "workspace members access audio_assets" on audio_assets;
drop policy if exists "students read audio_assets for enrolled courses" on audio_assets;
drop policy if exists "allow_public_select_audio_assets_published_courses" on audio_assets;

create policy "workspace members access audio_assets"
  on audio_assets
  for all
  to public
  using (
    exists (
      select 1
      from audio_asset_attachments aa
      join content_blocks cb on cb.id = aa.content_block_id
      join course_lessons cl on cl.id = cb.lesson_id
      join workspace_members wm on wm.workspace_id = cl.workspace_id
      where aa.audio_asset_id = audio_assets.id
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
      from audio_asset_attachments aa
      join content_blocks cb on cb.id = aa.content_block_id
      join course_lessons cl on cl.id = cb.lesson_id
      join enrollments e on e.course_id = cl.course_id
      join contacts ct on ct.id = e.contact_id
      where aa.audio_asset_id = audio_assets.id
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
      from audio_asset_attachments aa
      join content_blocks cb on cb.id = aa.content_block_id
      join course_lessons cl on cl.id = cb.lesson_id
      join courses c on c.id = cl.course_id
      where aa.audio_asset_id = audio_assets.id
        and (c.published = true or c.status = 'published')
    )
  );

-- Phase 1's lms_role_gate_* RESTRICTIVE policies on audio_assets ALSO reference
-- content_block_id directly (Postgres won't let the column drop below while they depend on it) —
-- drop and recreate them against the join table too, same expression shape as every other
-- lms_role_gate_* policy already uses.
drop policy if exists lms_role_gate_ins on audio_assets;
drop policy if exists lms_role_gate_upd on audio_assets;
drop policy if exists lms_role_gate_del on audio_assets;

create policy lms_role_gate_ins on audio_assets as restrictive for insert to authenticated
  with check (true);
create policy lms_role_gate_upd on audio_assets as restrictive for update to authenticated
  using (
    exists (
      select 1
      from audio_asset_attachments aa
      where aa.audio_asset_id = audio_assets.id
        and public.lms_member_role_ok(
          (select cl.workspace_id from public.content_blocks cb join public.course_lessons cl on cl.id = cb.lesson_id where cb.id = aa.content_block_id)
        )
    )
    -- An asset with zero attachments yet (mid-creation, before the attachment row is inserted)
    -- must still be updatable by the caller who's creating it — INSERT already isn't gated here
    -- (WITH CHECK true), so this only tightens rows that already have at least one attachment.
    or not exists (select 1 from audio_asset_attachments aa where aa.audio_asset_id = audio_assets.id)
  )
  with check (true);
create policy lms_role_gate_del on audio_assets as restrictive for delete to authenticated
  using (
    exists (
      select 1
      from audio_asset_attachments aa
      where aa.audio_asset_id = audio_assets.id
        and public.lms_member_role_ok(
          (select cl.workspace_id from public.content_blocks cb join public.course_lessons cl on cl.id = cb.lesson_id where cb.id = aa.content_block_id)
        )
    )
    or not exists (select 1 from audio_asset_attachments aa where aa.audio_asset_id = audio_assets.id)
  );

-- Now safe to drop the old 1:1 column + its unique index.
drop index if exists idx_audio_assets_content_block;
alter table audio_assets drop constraint if exists audio_assets_content_block_id_fkey;
alter table audio_assets drop column if exists content_block_id;

-- Extend the Batch 3 instructor role gate to the new table, same pattern as Phase 1's migration.
DO $$
DECLARE
  spec text[][] := ARRAY[
    ['audio_asset_attachments', '(SELECT cl.workspace_id FROM public.content_blocks cb JOIN public.course_lessons cl ON cl.id = cb.lesson_id WHERE cb.id = content_block_id)', 'n']
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
