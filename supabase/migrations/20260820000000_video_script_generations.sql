-- Task 100: AI Video/Reels/TikTok Script & Hashtag Generator
-- Append-only generation history (like ai_generations), but with structured
-- JSONB output (like ai_research_reports) since script/hashtags are
-- structured data, not prose. No expires_at staleness marker here — unlike
-- revenue_forecasts/campaign_recommendations there's no single "current"
-- generation being cached/superseded; every generation is a distinct,
-- independently useful draft the user can revisit via history.
CREATE TABLE IF NOT EXISTS public.video_script_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    created_by UUID,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram_reels', 'youtube_shorts')),
    input_params JSONB NOT NULL,
    generated_script JSONB NOT NULL,
    generated_hashtags JSONB NOT NULL DEFAULT '[]'::JSONB,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_script_generations_workspace_created
    ON public.video_script_generations(workspace_id, created_at DESC);

ALTER TABLE public.video_script_generations ENABLE ROW LEVEL SECURITY;

-- Read-only for workspace members, same rationale as revenue_forecasts /
-- campaign_recommendations: this is a credit-metered, rate-limited AI
-- output, so writes only happen through the API route's service-role
-- client (which enforces the cooldown and credit check before insert).
DROP POLICY IF EXISTS "Workspace read access for video_script_generations" ON public.video_script_generations;
CREATE POLICY "Workspace read access for video_script_generations" ON public.video_script_generations
    FOR SELECT USING (check_workspace_access(workspace_id));
