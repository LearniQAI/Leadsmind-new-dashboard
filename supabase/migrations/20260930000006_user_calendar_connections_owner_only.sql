-- user_calendar_connections: owner-only access.
--
-- The only policy was `FOR ALL USING (check_workspace_access(workspace_id))`, so any member of a
-- workspace could read, overwrite or delete ANY other member's connection row, and (no WITH CHECK)
-- insert a row carrying a colleague's user_id. Tokens are encrypted at rest, but a member could
-- still kill or hijack a colleague's calendar/Zoom connection — and Gmail mailbox tokens are about
-- to move into this same table (provider 'gmail').
--
-- Every application path (OAuth callbacks, token refresh, busy sync, webhooks, the integrations
-- route, listWorkspaceCalendarConnections) uses the service role, which bypasses RLS, so nothing in
-- the app depends on cross-member access. No DB function or view reads this table.

DROP POLICY IF EXISTS "Workspace access for user_calendar_connections" ON public.user_calendar_connections;

CREATE POLICY "user_calendar_connections_owner_select" ON public.user_calendar_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND check_workspace_access(workspace_id));

CREATE POLICY "user_calendar_connections_owner_insert" ON public.user_calendar_connections
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND check_workspace_access(workspace_id));

CREATE POLICY "user_calendar_connections_owner_update" ON public.user_calendar_connections
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND check_workspace_access(workspace_id))
  WITH CHECK (user_id = auth.uid() AND check_workspace_access(workspace_id));

CREATE POLICY "user_calendar_connections_owner_delete" ON public.user_calendar_connections
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND check_workspace_access(workspace_id));

-- anon never has a legitimate reason to touch OAuth token rows; TRUNCATE bypasses RLS entirely.
REVOKE ALL ON public.user_calendar_connections FROM anon;
REVOKE TRUNCATE ON public.user_calendar_connections FROM authenticated;
