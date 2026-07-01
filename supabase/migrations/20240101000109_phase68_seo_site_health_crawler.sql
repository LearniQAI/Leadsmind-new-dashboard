-- Phase 68: SEO Site Health Crawler Schema

CREATE TABLE IF NOT EXISTS public.seo_site_health_crawls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    health_score INTEGER NOT NULL CHECK (health_score >= 0 AND health_score <= 100),
    pages_crawled INTEGER NOT NULL DEFAULT 0,
    is_https BOOLEAN NOT NULL DEFAULT TRUE,
    has_crawl_failure BOOLEAN NOT NULL DEFAULT FALSE,
    desktop_performance INTEGER,
    desktop_fcp NUMERIC(5,2),
    desktop_lcp NUMERIC(5,2),
    desktop_cls NUMERIC(5,3),
    desktop_tbt INTEGER,
    mobile_performance INTEGER,
    mobile_fcp NUMERIC(5,2),
    mobile_lcp NUMERIC(5,2),
    mobile_cls NUMERIC(5,3),
    mobile_tbt INTEGER,
    status_codes JSONB DEFAULT '[]'::jsonb NOT NULL,
    redirect_chains JSONB DEFAULT '[]'::jsonb NOT NULL,
    missing_alts JSONB DEFAULT '[]'::jsonb NOT NULL,
    pages_with_errors JSONB DEFAULT '[]'::jsonb NOT NULL,
    issues_list JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on project_id for dashboard reads
CREATE INDEX IF NOT EXISTS idx_seo_site_health_crawls_project_id ON public.seo_site_health_crawls(project_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.seo_site_health_crawls ENABLE ROW LEVEL SECURITY;

-- Security Policies
DROP POLICY IF EXISTS "Workspace Members View Health Crawls" ON public.seo_site_health_crawls;
CREATE POLICY "Workspace Members View Health Crawls" ON public.seo_site_health_crawls
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM public.seo_projects p
            WHERE p.workspace_id IN (
                SELECT ws_member.workspace_id 
                FROM public.workspace_members ws_member 
                WHERE ws_member.user_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Workspace Members Manage Health Crawls" ON public.seo_site_health_crawls;
CREATE POLICY "Workspace Members Manage Health Crawls" ON public.seo_site_health_crawls
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM public.seo_projects p
            WHERE p.workspace_id IN (
                SELECT ws_member.workspace_id 
                FROM public.workspace_members ws_member 
                WHERE ws_member.user_id = auth.uid()
            )
        )
    );
