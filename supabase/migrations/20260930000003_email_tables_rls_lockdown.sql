-- Lock down client writes on sender_domains, global_suppression_list and email_tracking_logs.
--
-- Each table had a single `FOR ALL` policy for any workspace member (roles {public}, no
-- WITH CHECK), so any member could, straight from the browser:
--   * set sender_domains.spf_status / dkim_status = true, skipping DNS verification and the
--     admin/owner-only server action, and unlocking the campaign send gate;
--   * DELETE unsubscribe / erasure rows from global_suppression_list (POPIA risk);
--   * forge or delete email_tracking_logs events.
--
-- After this migration members may only READ these tables. Writes:
--   sender_domains          INSERT/DELETE by admin/owner; INSERT must carry unverified status.
--                           No UPDATE policy: status is written only by verifySenderDomain
--                           (service role) after a real DNS check.
--   global_suppression_list INSERT by admin/owner only. No UPDATE/DELETE: an opt-out is never
--                           removed from the browser. Unsubscribe + erasure write via service role.
--   email_tracking_logs     no client writes; only the deliverability webhook (service role).

-- sender_domains ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace Sender Domains Access" ON public.sender_domains;

CREATE POLICY "sender_domains_member_select" ON public.sender_domains
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "sender_domains_admin_insert_unverified" ON public.sender_domains
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT m.workspace_id FROM public.workspace_members m
      WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'owner')
    )
    AND spf_status IS NOT TRUE
    AND dkim_status IS NOT TRUE
    AND dmarc_status IS NOT TRUE
    AND verified_at IS NULL
  );

CREATE POLICY "sender_domains_admin_delete" ON public.sender_domains
  FOR DELETE TO authenticated
  USING (workspace_id IN (
    SELECT m.workspace_id FROM public.workspace_members m
    WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'owner')
  ));

-- global_suppression_list ---------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace Suppression List Access" ON public.global_suppression_list;

CREATE POLICY "global_suppression_list_member_select" ON public.global_suppression_list
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "global_suppression_list_admin_insert" ON public.global_suppression_list
  FOR INSERT TO authenticated
  WITH CHECK (workspace_id IN (
    SELECT m.workspace_id FROM public.workspace_members m
    WHERE m.user_id = auth.uid() AND m.role IN ('admin', 'owner')
  ));

-- email_tracking_logs -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Workspace Email Tracking Logs Access" ON public.email_tracking_logs;

CREATE POLICY "email_tracking_logs_member_select" ON public.email_tracking_logs
  FOR SELECT TO authenticated
  USING (workspace_id IN (
    SELECT m.workspace_id FROM public.workspace_members m WHERE m.user_id = auth.uid()
  ));
