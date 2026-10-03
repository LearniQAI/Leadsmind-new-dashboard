-- SEC S3: workspace_audit_logs was writable, editable and deletable by any member of the workspace.
--
-- The single policy "Workspace isolation for workspace_audit_logs" was FOR ALL with USING only, so any member could INSERT rows
-- with any actor_id, UPDATE them and DELETE them: an audit trail that its own subjects can rewrite is not evidence.
--
-- Now: members may READ their workspace's log and may APPEND a row only as themselves (actor_id = auth.uid()) inside a workspace
-- they belong to. Nobody but the service role can UPDATE, DELETE or TRUNCATE. anon has no access at all.
--
-- Audit: the only writer is WorkspaceAuditEngine.logAction (member session, INSERT, actor passed by the caller) and its only caller,
-- ApprovalFlowEngine, has no callers on HEAD or origin/master; the only reader is WorkspaceAuditEngine.getAuditTimeline (SELECT).
-- No code updates or deletes audit rows. The table has 0 rows today.
drop policy if exists "Workspace isolation for workspace_audit_logs" on public.workspace_audit_logs;

create policy "Members read their workspace audit logs"
  on public.workspace_audit_logs
  for select
  to authenticated
  using (workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id = auth.uid()));

create policy "Members append audit rows as themselves"
  on public.workspace_audit_logs
  for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and workspace_id in (select m.workspace_id from public.workspace_members m where m.user_id = auth.uid())
  );

revoke all on table public.workspace_audit_logs from anon;
revoke update, delete, truncate on table public.workspace_audit_logs from authenticated;
