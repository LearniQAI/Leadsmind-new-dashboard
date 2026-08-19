-- Task 101: AI Campaign-Performance Recommendations
-- One row per generation, tied to a real campaign in public.ad_campaigns
-- (manually-entered metrics for now — see AdsClient's "Add campaign"
-- flow; no ad-platform sync exists yet). Same shape/rationale as
-- revenue_forecasts: JSONB in/out snapshot pair + expires_at staleness
-- marker, read-only RLS, writes only via the API route's service-role client.
CREATE TABLE IF NOT EXISTS public.campaign_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    requested_by UUID,
    input_metrics_snapshot JSONB NOT NULL,
    recommendations JSONB NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_recommendations_campaign_created
    ON public.campaign_recommendations(campaign_id, created_at DESC);

ALTER TABLE public.campaign_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace read access for campaign_recommendations" ON public.campaign_recommendations;
CREATE POLICY "Workspace read access for campaign_recommendations" ON public.campaign_recommendations
    FOR SELECT USING (check_workspace_access(workspace_id));
