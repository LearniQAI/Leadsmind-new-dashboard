-- Task 98: AI Ad-Copy Generator (Facebook/Google/LinkedIn)
-- Same shape/rationale as landing_page_copy_generations and
-- video_script_generations: append-only generation history with structured
-- JSONB output, read-only RLS (writes only via the API route's service-role
-- client). campaign_id is nullable — this is usable standalone (drafting
-- copy before a campaign exists) or optionally attached to an existing
-- ad_campaigns row (Task 101) the user already created.
CREATE TABLE IF NOT EXISTS public.ad_copy_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID,
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'google', 'linkedin')),
    input_params JSONB NOT NULL,
    generated_copy JSONB NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_copy_generations_workspace_created
    ON public.ad_copy_generations(workspace_id, created_at DESC);

ALTER TABLE public.ad_copy_generations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace read access for ad_copy_generations" ON public.ad_copy_generations;
CREATE POLICY "Workspace read access for ad_copy_generations" ON public.ad_copy_generations
    FOR SELECT USING (check_workspace_access(workspace_id));
