-- Harden CRM automation security.
--
-- 1. Re-enables Row Level Security on workflows/workflow_steps/workflow_executions/
--    workflow_step_logs, which migration 20240101000104_phase61_sprint15_disable_rls_workflows.sql
--    turned off workspace-wide as a workaround for automation-save reliability. The
--    application's automation engines (WorkflowEngine, AutomationLogger, TriggerDispatcher,
--    lib/automation/executor.ts) already exclusively use the service-role admin client
--    (createAdminClient()), which bypasses RLS entirely, so re-enabling RLS here does not
--    change their behavior. It closes a live gap: two client components
--    (ExecutionLogs.tsx, WorkflowEditor.tsx) query and mutate these tables directly from
--    the browser using the anon-key session client, filtered only by workflow_id/form_id
--    with no workspace_id check in the query itself — with RLS off, any authenticated
--    user in any workspace could read or overwrite another workspace's workflows, steps,
--    and execution logs just by knowing/guessing a UUID.
--
-- 2. Removes the public "WITH CHECK (true)" INSERT policy on form_submissions. Public form
--    submissions go through /api/public/forms/[id]/submit, which uses the service-role
--    admin client and therefore does not need or use an anon-role INSERT grant. Leaving
--    the policy in place allowed anyone to insert arbitrary form_submissions rows tagged
--    with any workspace_id directly against the database, bypassing the app's own
--    form-existence/workspace-match checks.

-- ── 1. Re-enable RLS on automation tables ──────────────────────────────────────

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_logs ENABLE ROW LEVEL SECURITY;

-- Replace with policies built on check_workspace_access(), the SECURITY DEFINER
-- helper already used across the rest of the schema (contacts, activities, LMS,
-- builder, meet, etc.) — safe against the recursive-policy issue that affected
-- workspace_members directly, since it evaluates in a definer context rather than
-- re-triggering RLS on workspace_members from within another table's policy.

DROP POLICY IF EXISTS "Workspace access for workflows" ON public.workflows;
CREATE POLICY "Workspace access for workflows" ON public.workflows
    FOR ALL
    USING (check_workspace_access(workspace_id))
    WITH CHECK (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace access for steps" ON public.workflow_steps;
CREATE POLICY "Workspace access for steps" ON public.workflow_steps
    FOR ALL
    USING (check_workspace_access(workspace_id))
    WITH CHECK (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace access for executions" ON public.workflow_executions;
CREATE POLICY "Workspace access for executions" ON public.workflow_executions
    FOR ALL
    USING (check_workspace_access(workspace_id))
    WITH CHECK (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace access for step logs" ON public.workflow_step_logs;
CREATE POLICY "Workspace access for step logs" ON public.workflow_step_logs
    FOR ALL
    USING (check_workspace_access(workspace_id))
    WITH CHECK (check_workspace_access(workspace_id));

-- ── 2. Remove the public write-open policy on form_submissions ─────────────────
-- The remaining "Workspace Submissions Access" policy (member-scoped FOR ALL) is
-- left untouched; it already covers authenticated dashboard reads/writes. No
-- replacement anon INSERT policy is added: public submissions are handled
-- entirely by the service-role admin client in the API route.

DROP POLICY IF EXISTS "Public Form Submit" ON public.form_submissions;

-- form_submissions.RLS was already enabled by 20240101000016_phase9_10_campaigns_forms.sql;
-- re-assert it here defensively in case that ever regresses alongside the workflow tables.
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;
