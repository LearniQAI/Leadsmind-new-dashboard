-- Up Migration
CREATE TABLE IF NOT EXISTS public.ai_quality_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    generation_id UUID NOT NULL REFERENCES public.ai_generations(id) ON DELETE CASCADE,
    is_positive_rating BOOLEAN NOT NULL,
    user_feedback_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Ensure strict constraints on balance usage ceilings
ALTER TABLE public.ai_usage_credits DROP CONSTRAINT IF EXISTS chk_usage_ceiling;
ALTER TABLE public.ai_usage_credits ADD CONSTRAINT chk_usage_ceiling 
CHECK (credits_used_this_period <= (plan_monthly_credits + credits_purchased_addon));

-- RLS Enablement
ALTER TABLE public.ai_quality_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for quality_feedback" ON public.ai_quality_feedback;
CREATE POLICY "Workspace access for quality_feedback" ON public.ai_quality_feedback 
    FOR ALL USING (check_workspace_access(workspace_id));
