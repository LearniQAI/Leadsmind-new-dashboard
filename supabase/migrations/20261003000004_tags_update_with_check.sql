-- SEC S2: a member could retype a tag to 'system' (or 'automation').
--
-- The UPDATE policy "Workspace members can update tags" had a USING clause and NO WITH CHECK, so the new row only had to pass USING
-- (workspace access + creator/admin) and the tag_type CHECK constraint allows 'system'. A creator could therefore flip their own
-- tag to tag_type = 'system'.
--
-- WITH CHECK now keeps the same workspace/creator-or-admin rule for the NEW row and adds: a member cannot set tag_type to
-- 'system' or 'automation' unless the row ALREADY has that type (so existing system tags stay editable for colour/name by
-- admins exactly as before, but nothing can be turned into one). The service role bypasses RLS and is unaffected.
--
-- Audit: no member-session code path updates tags.tag_type (TagRepository updates name/color/icon/category/visibility/parent/expiry;
-- the v1 API, the expiry cron and the AI/auto-tagging paths use the admin client). Identical on origin/master and HEAD.
alter policy "Workspace members can update tags" on public.tags
  with check (
    public.check_workspace_access(workspace_id)
    and (
      created_by = auth.uid()
      or exists (
        select 1
          from public.workspace_members wm
         where wm.workspace_id = tags.workspace_id
           and wm.user_id = auth.uid()
           and wm.role = any (array['admin'::text, 'owner'::text])
      )
    )
    and (
      tag_type <> all (array['system'::text, 'automation'::text])
      or exists (
        select 1
          from public.tags t0
         where t0.id = tags.id
           and t0.tag_type = tags.tag_type
      )
    )
  );
