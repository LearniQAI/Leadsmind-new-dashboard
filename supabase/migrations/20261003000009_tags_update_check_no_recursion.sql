-- SEC S2 fix-forward: migration 20261003000004 made the tags UPDATE policy's WITH CHECK read public.tags, which RLS re-evaluates
-- recursively (42P17 "infinite recursion detected in policy for relation tags"), so EVERY member tag UPDATE failed.
--
-- The "already has that type" lookup now goes through a SECURITY DEFINER function (RLS-bypassing read of one column of one row,
-- search_path pinned, executable by client roles because the policy runs as the caller). It only answers "is this tag already
-- of this type", which reveals nothing across workspaces beyond a boolean for an id the caller is already updating.
create or replace function public.tag_has_type(p_tag_id uuid, p_type text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.tags t0 where t0.id = p_tag_id and t0.tag_type = p_type);
$$;

revoke all on function public.tag_has_type(uuid, text) from public;
grant execute on function public.tag_has_type(uuid, text) to authenticated, service_role;

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
      or public.tag_has_type(tags.id, tags.tag_type)
    )
  );
