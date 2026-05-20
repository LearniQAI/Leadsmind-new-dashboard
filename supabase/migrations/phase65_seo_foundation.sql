-- Phase 65: SEO Bedrock & Google Search Console Integration Schema

-- Enable PG crypto functions if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table 1: seo_projects
CREATE TABLE IF NOT EXISTS public.seo_projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    domain_url TEXT NOT NULL,
    gsc_connected BOOLEAN DEFAULT FALSE NOT NULL,
    gsc_refresh_token_encrypted TEXT,
    cached_gsc_clicks INTEGER DEFAULT 0 NOT NULL,
    cached_gsc_impressions INTEGER DEFAULT 0 NOT NULL,
    cached_gsc_ctr NUMERIC(5,4) DEFAULT 0.0000 NOT NULL,
    cached_gsc_position NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table 2: seo_tracked_keywords
CREATE TABLE IF NOT EXISTS public.seo_tracked_keywords (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    target_url TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_project_keyword UNIQUE (project_id, keyword)
);

-- Table 3: seo_rank_history (Partitioned Table)
CREATE TABLE IF NOT EXISTS public.seo_rank_history (
    id UUID DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    rank INTEGER,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id, date)
) PARTITION BY RANGE (date);

-- Create DEFAULT Catch-All partition for seo_rank_history
CREATE TABLE IF NOT EXISTS public.seo_rank_history_default 
    PARTITION OF public.seo_rank_history DEFAULT;

-- Table 4: seo_keyword_performance (Partitioned Table for GSC stats)
CREATE TABLE IF NOT EXISTS public.seo_keyword_performance (
    id UUID DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    clicks INTEGER DEFAULT 0 NOT NULL,
    impressions INTEGER DEFAULT 0 NOT NULL,
    ctr NUMERIC(7,6) DEFAULT 0.000000 NOT NULL,
    position NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id, date),
    CONSTRAINT unique_perf_project_keyword_date UNIQUE (project_id, keyword, date)
) PARTITION BY RANGE (date);

-- Create DEFAULT Catch-All partition for seo_keyword_performance
CREATE TABLE IF NOT EXISTS public.seo_keyword_performance_default 
    PARTITION OF public.seo_keyword_performance DEFAULT;

-- Table 5: seo_content_pipeline
CREATE TABLE IF NOT EXISTS public.seo_content_pipeline (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Idea' CHECK (status IN ('Idea', 'Research', 'Approved', 'Outlined', 'Writing', 'Review', 'Scheduled', 'Published')),
    title TEXT,
    target_date DATE,
    assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_pipeline_project_keyword UNIQUE (project_id, keyword)
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_seo_projects_workspace_id ON public.seo_projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_seo_tracked_keywords_project_id ON public.seo_tracked_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_tracked_keywords_keyword ON public.seo_tracked_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_rank_history_project_id ON public.seo_rank_history(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_rank_history_keyword ON public.seo_rank_history(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_rank_history_date ON public.seo_rank_history(date);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_perf_project_id ON public.seo_keyword_performance(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_perf_keyword ON public.seo_keyword_performance(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_perf_date ON public.seo_keyword_performance(date);
CREATE INDEX IF NOT EXISTS idx_seo_content_pipeline_project_id ON public.seo_content_pipeline(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_pipeline_keyword ON public.seo_content_pipeline(keyword);

-- Enable Row Level Security (RLS)
ALTER TABLE public.seo_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_tracked_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_rank_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_content_pipeline ENABLE ROW LEVEL SECURITY;

-- Workspace-Aware Security Policies

-- policies for seo_projects
CREATE POLICY "Workspace Members View Projects" ON public.seo_projects
    FOR SELECT USING (
        workspace_id IN (
            SELECT ws_member.workspace_id 
            FROM public.workspace_members ws_member 
            WHERE ws_member.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace Members Manage Projects" ON public.seo_projects
    FOR ALL USING (
        workspace_id IN (
            SELECT ws_member.workspace_id 
            FROM public.workspace_members ws_member 
            WHERE ws_member.user_id = auth.uid()
        )
    );

-- policies for seo_tracked_keywords
CREATE POLICY "Workspace Members View Keywords" ON public.seo_tracked_keywords
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

CREATE POLICY "Workspace Members Manage Keywords" ON public.seo_tracked_keywords
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

-- policies for seo_rank_history
CREATE POLICY "Workspace Members View Rank History" ON public.seo_rank_history
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

CREATE POLICY "Workspace Members Manage Rank History" ON public.seo_rank_history
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

-- policies for seo_keyword_performance
CREATE POLICY "Workspace Members View Performance" ON public.seo_keyword_performance
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

CREATE POLICY "Workspace Members Manage Performance" ON public.seo_keyword_performance
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

-- policies for seo_content_pipeline
CREATE POLICY "Workspace Members View Pipeline" ON public.seo_content_pipeline
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

CREATE POLICY "Workspace Members Manage Pipeline" ON public.seo_content_pipeline
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

-- Modtime Update trigger functions
CREATE OR REPLACE FUNCTION update_seo_projects_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_projects_modtime
BEFORE UPDATE ON public.seo_projects
FOR EACH ROW EXECUTE PROCEDURE update_seo_projects_modtime();

CREATE OR REPLACE FUNCTION update_seo_content_pipeline_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_seo_content_pipeline_modtime
BEFORE UPDATE ON public.seo_content_pipeline
FOR EACH ROW EXECUTE PROCEDURE update_seo_content_pipeline_modtime();
