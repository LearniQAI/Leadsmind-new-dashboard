-- Migration: Phase 79 - Unified Automation Engine

-- 1. Automation Workflows
CREATE TABLE IF NOT EXISTS public.automation_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    execution_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Workflow Triggers
CREATE TABLE IF NOT EXISTS public.workflow_triggers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'form_submitted', 'lead_imported', 'opportunity_stage_changed'
    conditions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Workflow Actions
CREATE TABLE IF NOT EXISTS public.workflow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'assign_owner', 'create_opportunity', 'add_tag'
    parameters JSONB DEFAULT '{}'::jsonb,
    sequence_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Workflow Execution Logs
CREATE TABLE IF NOT EXISTS public.workflow_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    trigger_event TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    status TEXT NOT NULL, -- 'success', 'failed', 'running'
    execution_time_ms INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Workflow Failures (Dead Letter Queue)
CREATE TABLE IF NOT EXISTS public.workflow_failures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_log_id UUID REFERENCES public.workflow_execution_logs(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
    error_message TEXT NOT NULL,
    failed_action_type TEXT NOT NULL,
    retry_count INTEGER DEFAULT 0,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_failures ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_automation_workflows_workspace ON public.automation_workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_event ON public.workflow_triggers(event_type);
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_workspace ON public.workflow_execution_logs(workspace_id);

-- Policies (Workspace Isolation)
CREATE POLICY "Workspace isolation for automation_workflows" ON public.automation_workflows FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for workflow_triggers" ON public.workflow_triggers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.automation_workflows w WHERE w.id = workflow_id AND w.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Workspace isolation for workflow_actions" ON public.workflow_actions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.automation_workflows w WHERE w.id = workflow_id AND w.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
);

CREATE POLICY "Workspace isolation for workflow_execution_logs" ON public.workflow_execution_logs FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for workflow_failures" ON public.workflow_failures FOR ALL USING (
    EXISTS (SELECT 1 FROM public.automation_workflows w WHERE w.id = workflow_id AND w.workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
);
