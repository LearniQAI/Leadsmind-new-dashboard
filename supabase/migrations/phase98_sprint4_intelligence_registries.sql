-- Up Migration
CREATE TYPE research_mode_enum AS ENUM (
    'company_full', 'contact_enrichment', 'pre_meeting_brief', 'lead_score_update'
);

CREATE TABLE IF NOT EXISTS public.ai_research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL, 
    company_domain VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    research_type research_mode_enum NOT NULL,
    report_json JSONB NOT NULL,
    lead_score INT CHECK (lead_score >= 0 AND lead_score <= 100),
    lead_score_breakdown JSONB NOT NULL DEFAULT '{}'::JSONB,
    sources_used TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    tokens_used INT NOT NULL DEFAULT 0,
    requested_by UUID,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_research_cache ON public.ai_research_reports(company_domain, expires_at);

-- RLS Policies
ALTER TABLE public.ai_research_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace access for research_reports" ON public.ai_research_reports;
CREATE POLICY "Workspace access for research_reports" ON public.ai_research_reports 
    FOR ALL USING (check_workspace_access(workspace_id));
