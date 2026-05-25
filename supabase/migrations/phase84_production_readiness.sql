-- Migration: Phase 84 - Production Readiness & Operational Hardening

-- 1. Onboarding Progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    module TEXT NOT NULL, -- 'workspace', 'crm', 'forms', 'leadsfinder'
    is_completed BOOLEAN DEFAULT false,
    dismissed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    UNIQUE(workspace_id, user_id, module)
);

-- 2. Platform Feedback (Beta Infrastructure)
CREATE TABLE IF NOT EXISTS public.platform_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL, -- 'bug', 'feature_request', 'general'
    content TEXT NOT NULL,
    route_context TEXT,
    browser_info JSONB,
    status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Observability Metrics
CREATE TABLE IF NOT EXISTS public.observability_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL, -- 'api_latency', 'workflow_failure', 'realtime_disconnect'
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    source TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE, -- Optional, could be system level
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. System Health Logs
CREATE TABLE IF NOT EXISTS public.system_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'healthy', 'degraded', 'down'
    ping_latency_ms INTEGER,
    last_checked_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Deployment Validations
CREATE TABLE IF NOT EXISTS public.deployment_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_version TEXT NOT NULL,
    validation_type TEXT NOT NULL, -- 'migration', 'env_check', 'dependency_check'
    passed BOOLEAN NOT NULL,
    logs JSONB,
    executed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observability_metrics ENABLE ROW LEVEL SECURITY;

-- Workspace Isolation Policies
CREATE POLICY "Workspace isolation for onboarding_progress" ON public.onboarding_progress FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for platform_feedback" ON public.platform_feedback FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

-- Observability metrics might need admin overrides, but for now we isolate by workspace if provided
CREATE POLICY "Workspace isolation for observability_metrics" ON public.observability_metrics FOR ALL USING (
    workspace_id IS NULL OR workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

-- System Health and Deployment Validations are global internal tables, no RLS needed for reading by admins, 
-- but we will enforce RLS to block public read/write.
ALTER TABLE public.system_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployment_validations ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_observability_metrics_type ON public.observability_metrics(metric_type, severity);
CREATE INDEX IF NOT EXISTS idx_system_health_service ON public.system_health_logs(service_name);
