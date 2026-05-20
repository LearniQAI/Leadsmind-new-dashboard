-- Disable RLS on workflows and workflow_steps to ensure reliable CRM automation saves
ALTER TABLE public.workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_logs DISABLE ROW LEVEL SECURITY;
