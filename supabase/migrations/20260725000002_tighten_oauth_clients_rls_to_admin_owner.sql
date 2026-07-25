-- oauth_clients RLS allowed SELECT/INSERT/UPDATE/DELETE to ANY workspace_members row, with no
-- role filter (20240101000164_api_integrations_oauth.sql:47-81). Combined with
-- createOAuthClient()/deleteOAuthClient()/getOAuthClients() in src/app/actions/settings.ts only
-- checking getActiveWorkspaceId() (no role check), any workspace member — not just admin/owner
-- — could mint or delete OAuth clients capable of obtaining bearer tokens scoped to the
-- workspace, or list existing client configuration.
--
-- The app layer now requires requireWorkspaceRole(['admin','owner']) for all three actions. This
-- migration applies the same lesson as the enrollments/quiz_attempts/course_progress and
-- ai_usage_credits lockdowns: an app-layer check alone doesn't stop a direct
-- supabase.from('oauth_clients').insert(...)/.delete(...) call from a non-admin member's own
-- client session. Confirmed via search that nothing else legitimately writes to this table —
-- src/app/api/oauth/authorize/route.ts and src/app/api/oauth/token/route.ts only ever SELECT
-- it, both via the service-role client (createAdminClient(), unaffected by RLS either way).
-- The UPDATE policy has zero callers anywhere in the app.

DROP POLICY IF EXISTS "Workspace members can read oauth clients" ON public.oauth_clients;
DROP POLICY IF EXISTS "Workspace members can insert oauth clients" ON public.oauth_clients;
DROP POLICY IF EXISTS "Workspace members can update oauth clients" ON public.oauth_clients;
DROP POLICY IF EXISTS "Workspace members can delete oauth clients" ON public.oauth_clients;

CREATE POLICY "Workspace admins can read oauth clients" ON public.oauth_clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Workspace admins can insert oauth clients" ON public.oauth_clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Workspace admins can update oauth clients" ON public.oauth_clients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Workspace admins can delete oauth clients" ON public.oauth_clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );
