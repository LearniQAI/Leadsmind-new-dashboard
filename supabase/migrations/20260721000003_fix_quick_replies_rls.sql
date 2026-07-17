-- Priority 0 security remediation (item 7, messaging module).
--
-- public.quick_replies had two fully-open policies restricted only to the
-- `authenticated` role, not to workspace membership: "Allow authenticated to
-- manage quick replies" (FOR ALL USING (true)) and "Allow authenticated to
-- select quick replies" (FOR SELECT USING (true)) — any authenticated user,
-- regardless of workspace, could read/write/delete any workspace's quick
-- replies. This is the one item in this remediation pass where the database
-- policy itself (not just a missing app-layer check) is the primary bug.
--
-- Replaced with workspace_members-scoped policies, matching the pattern used
-- correctly elsewhere in this codebase (check_workspace_access()).

DROP POLICY IF EXISTS "Allow authenticated to manage quick replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Allow authenticated to select quick replies" ON public.quick_replies;

CREATE POLICY "Workspace access for quick_replies"
    ON public.quick_replies FOR ALL
    USING (public.check_workspace_access(workspace_id))
    WITH CHECK (public.check_workspace_access(workspace_id));
