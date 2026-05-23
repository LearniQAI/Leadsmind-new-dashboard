-- Migration: Phase 80 - Revenue Execution & Tasks

-- 1. CRM Tasks
CREATE TABLE IF NOT EXISTS public.crm_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT DEFAULT 'general', -- 'general', 'followup', 'call', 'review'
    priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status TEXT DEFAULT 'Pending', -- 'Pending', 'In Progress', 'Completed', 'Overdue', 'Blocked'
    due_date TIMESTAMPTZ,
    
    -- Linked Entities (Polymorphic-ish, or explicit)
    contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
    company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES public.crm_opportunities(id) ON DELETE SET NULL,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

-- 2. Task Reminders
CREATE TABLE IF NOT EXISTS public.task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_time TIMESTAMPTZ NOT NULL,
    message TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Overdue Escalations
CREATE TABLE IF NOT EXISTS public.overdue_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.crm_tasks(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    escalation_reason TEXT NOT NULL,
    status TEXT DEFAULT 'Open', -- 'Open', 'Resolved'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overdue_escalations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_tasks_workspace ON public.crm_tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_owner ON public.crm_tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_status ON public.crm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_task_reminders_trigger ON public.task_reminders(trigger_time, is_sent);

-- Policies (Workspace Isolation)
CREATE POLICY "Workspace isolation for crm_tasks" ON public.crm_tasks FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for task_reminders" ON public.task_reminders FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for overdue_escalations" ON public.overdue_escalations FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
