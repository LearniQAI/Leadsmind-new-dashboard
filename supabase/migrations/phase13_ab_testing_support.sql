-- PHASE 13: A/B TESTING & GRAPH ARCHITECTURE HARDENING

-- 1. Ensure workflow_edges table exists (Crucial for the graph builder)
CREATE TABLE IF NOT EXISTS public.workflow_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
    target_step_id UUID NOT NULL REFERENCES public.workflow_steps(id) ON DELETE CASCADE,
    source_handle TEXT NOT NULL DEFAULT 'default',
    target_handle TEXT NOT NULL DEFAULT 'default',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fix for existing tables missing the workspace_id column
ALTER TABLE public.workflow_edges ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- Ensure defaults are set if tables were created without them
ALTER TABLE public.workflow_steps ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.workflow_edges ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. Security for workflow_edges
ALTER TABLE public.workflow_edges ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'workflow_edges' AND policyname = 'Workspace access for workflow_edges'
    ) THEN
        CREATE POLICY "Workspace access for workflow_edges" ON public.workflow_edges 
        FOR ALL USING (
            workflow_id IN (
                SELECT id FROM public.workflows 
                WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
            )
        );
    END IF;
END $$;

-- 3. Extend step logs for A/B tracking
ALTER TABLE public.workflow_step_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- 4. Analytics View for A/B Testing Results
CREATE OR REPLACE VIEW public.vw_ab_test_analytics AS
SELECT 
    ws.id as step_id,
    ws.workflow_id,
    w.name as workflow_name,
    ws.config->>'label' as step_label,
    l.metadata->>'assigned_variant' as variant,
    COUNT(l.id) as total_reached,
    COUNT(CASE WHEN l.status = 'completed' THEN 1 END) as total_completed,
    COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as total_failed
FROM 
    public.workflow_steps ws
JOIN 
    public.workflows w ON ws.workflow_id = w.id
JOIN 
    public.workflow_step_logs l ON ws.id = l.step_id
WHERE 
    ws.type = 'split'
    AND l.metadata->>'assigned_variant' IS NOT NULL
GROUP BY 
    ws.id, ws.workflow_id, w.name, ws.config->>'label', l.metadata->>'assigned_variant';

-- 5. Helper Function to Declare Winner (Optional but clean for future use)
-- This could be called via RPC if you want to move logic to DB
COMMENT ON VIEW public.vw_ab_test_analytics IS 'Aggregates A/B test results by variant for split nodes';
