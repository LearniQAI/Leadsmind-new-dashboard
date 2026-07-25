-- Phase 2: Harden RLS for sensitive connection tables

-- 1. bank_connections
drop policy if exists "workspace members manage bank_connections" on public.bank_connections;

create policy "workspace admins can view bank_connections"
  on public.bank_connections for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "workspace admins can manage bank_connections"
  on public.bank_connections for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );


-- 2. platform_connections
drop policy if exists "Workspace access for platform_connections" on public.platform_connections;

create policy "workspace admins can view platform_connections"
  on public.platform_connections for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "workspace admins can manage platform_connections"
  on public.platform_connections for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );


-- 3. social_accounts
drop policy if exists "Workspace Social Accounts Access" on public.social_accounts;

create policy "workspace admins can view social_accounts"
  on public.social_accounts for select
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "workspace admins can manage social_accounts"
  on public.social_accounts for all
  using (
    workspace_id in (
      select workspace_id from public.workspace_members
      where user_id = auth.uid() and role in ('admin', 'owner')
    )
  );
