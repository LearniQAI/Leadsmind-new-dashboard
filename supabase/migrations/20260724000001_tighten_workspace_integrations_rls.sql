-- Task 16: workspace_integrations.credentials was a no-op column until this task (the
-- connect flow never actually wrote real secrets into it), so "any workspace member" RLS was
-- harmless. Now that PayFast/Stripe credentials genuinely land there, tighten access to
-- workspace admins/owners only — same role tier already enforced at the API layer
-- (requireWorkspaceRole(['admin','owner'])) in /api/settings/integrations and the new Stripe
-- Connect flow. 'owner' is not a real workspace_members.role value in this schema (ownership
-- is tracked separately via workspaces.owner_id) but is kept in the role list for consistency
-- with every other admin/owner-gated check in this codebase — a harmless dead clause, not a
-- functional gap.

drop policy if exists "workspace members can view integrations" on public.workspace_integrations;
drop policy if exists "workspace members can manage integrations" on public.workspace_integrations;

create policy "workspace admins can view integrations"
  on public.workspace_integrations for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "workspace admins can manage integrations"
  on public.workspace_integrations for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );
