-- Migration: Sprint 9 Automation & CRM Action System
-- Extends workflows to support form-specific automations

ALTER TABLE public.workflows 
    ADD COLUMN IF NOT EXISTS form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE;

-- Ensure triggers have correct indexing
CREATE INDEX IF NOT EXISTS idx_workflows_form_id ON public.workflows(form_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON public.workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workspace_id ON public.workflow_executions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_logs_execution_id ON public.workflow_step_logs(execution_id);
