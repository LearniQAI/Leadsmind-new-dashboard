-- webhook_endpoints (20240101000036_phase18_19_20_final_infra.sql) had
-- ENABLE ROW LEVEL SECURITY with ZERO policies ever created for it — Postgres denies all
-- access to the authenticated role by default in that state. That happened to block the
-- session-scoped client entirely, but it was accidental safety, not a deliberate design: it
-- would become live and dangerous the moment anyone added a permissive policy or the app code
-- switched to a service-role client. The app layer now requires
-- requireWorkspaceRole(['admin','owner']) on all four legacy webhook actions in
-- src/app/actions/settings.ts. This migration replaces "zero policies = accidental deny" with a
-- real, deliberate admin/owner-scoped policy set, the same lesson already applied to
-- oauth_clients (20260725000002) and ai_usage_credits (20260722000002).
--
-- Confirmed this table is NOT dead/superseded by workspace_webhooks — it is the only table
-- read by the actual outbound webhook dispatcher
-- (src/lib/inngest/functions/webhookDispatch.ts), which runs via the service-role client and
-- is unaffected by RLS either way. workspace_webhooks has no dispatch consumer at all today.

CREATE POLICY "Workspace admins can read webhook_endpoints" ON public.webhook_endpoints
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_endpoints.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Workspace admins can insert webhook_endpoints" ON public.webhook_endpoints
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_endpoints.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Workspace admins can update webhook_endpoints" ON public.webhook_endpoints
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_endpoints.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Workspace admins can delete webhook_endpoints" ON public.webhook_endpoints
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = webhook_endpoints.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('admin', 'owner')
        )
    );
