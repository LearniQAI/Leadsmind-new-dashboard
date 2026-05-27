-- Up Migration
CREATE TYPE sa_language_enum AS ENUM ('en', 'af', 'zu', 'nso', 'xh');

CREATE TABLE IF NOT EXISTS public.workspace_brand_voice (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,
    industry VARCHAR(255) NOT NULL,
    services_description TEXT NOT NULL,
    target_audience TEXT NOT NULL,
    brand_personality VARCHAR(100) NOT NULL,
    tone_adjectives TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    words_to_use TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    words_to_avoid TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    sample_content_1 TEXT,
    sample_content_2 TEXT,
    sample_content_3 TEXT,
    primary_language sa_language_enum DEFAULT 'en'::sa_language_enum NOT NULL,
    secondary_language sa_language_enum,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ai_usage_credits (
    workspace_id UUID PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
    plan_monthly_credits INT NOT NULL DEFAULT 10,
    credits_used_this_period INT NOT NULL DEFAULT 0,
    credits_purchased_addon INT NOT NULL DEFAULT 0,
    billing_cycle_start DATE NOT NULL,
    billing_cycle_end DATE NOT NULL,
    last_notification_sent_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_positive_usage CHECK (credits_used_this_period >= 0)
);

-- Indexing for lookup performance and partition stability
CREATE INDEX IF NOT EXISTS idx_brand_voice_workspace ON public.workspace_brand_voice(workspace_id);
CREATE INDEX IF NOT EXISTS idx_usage_credits_lookup ON public.ai_usage_credits(workspace_id, billing_cycle_end);

-- RLS Policies
ALTER TABLE public.workspace_brand_voice ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for brand_voice" ON public.workspace_brand_voice;
CREATE POLICY "Workspace access for brand_voice" ON public.workspace_brand_voice 
    FOR ALL USING (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace access for usage_credits" ON public.ai_usage_credits;
CREATE POLICY "Workspace access for usage_credits" ON public.ai_usage_credits 
    FOR ALL USING (check_workspace_access(workspace_id));
