-- Task 102: AI Revenue Forecasting
-- Stores LLM-generated revenue forecasts, one row per generation, so past
-- forecasts stay auditable (input_data_snapshot is exactly what was fed to
-- the model). expires_at is the staleness marker: the API's cooldown check
-- and the frontend's "is this forecast still fresh" check both compare
-- against it (see /api/finance/revenue-forecast).
--
-- Follows the ai_research_reports precedent (JSONB output column, expires_at
-- staleness marker) rather than the plain-TEXT ai_generations table, since
-- forecast_result is structured data, not prose.
CREATE TABLE IF NOT EXISTS public.revenue_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    requested_by UUID,
    input_data_snapshot JSONB NOT NULL,
    forecast_result JSONB NOT NULL,
    model_used VARCHAR(50) NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_revenue_forecasts_workspace_created
    ON public.revenue_forecasts(workspace_id, created_at DESC);

ALTER TABLE public.revenue_forecasts ENABLE ROW LEVEL SECURITY;

-- Read-only for workspace members via the anon/authenticated client, matching
-- the ai_usage_credits lockdown precedent (20260722000002): rows here are a
-- credit-metered, rate-limited AI output, so writes must only happen through
-- the API route's service-role client (which enforces the cooldown and
-- credit check before insert), never directly from an authenticated client.
DROP POLICY IF EXISTS "Workspace read access for revenue_forecasts" ON public.revenue_forecasts;
CREATE POLICY "Workspace read access for revenue_forecasts" ON public.revenue_forecasts
    FOR SELECT USING (check_workspace_access(workspace_id));
