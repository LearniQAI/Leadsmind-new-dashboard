-- Phase 66: SEO Competitor Rank Tracking & Rich SERP Features Schema

-- 1. Alter seo_projects to add competitor domains and Google Business Profile name
ALTER TABLE public.seo_projects 
ADD COLUMN IF NOT EXISTS competitor_domains TEXT[] DEFAULT '{}'::text[] NOT NULL,
ADD COLUMN IF NOT EXISTS google_business_profile TEXT;

-- 2. Alter seo_rank_history to add rich SERP feature columns
ALTER TABLE public.seo_rank_history
ADD COLUMN IF NOT EXISTS ranking_url TEXT,
ADD COLUMN IF NOT EXISTS featured_snippet BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS local_pack BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS people_also_ask_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS competitor_ranks JSONB DEFAULT '{}'::jsonb NOT NULL;

-- 3. Add unique constraint to seo_rank_history to support robust upsert sync
-- Note: Must include the partition key (date)
ALTER TABLE public.seo_rank_history
ADD CONSTRAINT unique_rank_project_keyword_date UNIQUE (project_id, keyword, date);

-- 4. Create Table: seo_competitor_keywords (Partitioned by Date)
CREATE TABLE IF NOT EXISTS public.seo_competitor_keywords (
    id UUID DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.seo_projects(id) ON DELETE CASCADE,
    competitor_domain TEXT NOT NULL,
    keyword TEXT NOT NULL,
    rank INTEGER NOT NULL,
    url TEXT,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (id, date),
    CONSTRAINT unique_competitor_keyword_project_date UNIQUE (project_id, competitor_domain, keyword, date)
) PARTITION BY RANGE (date);

-- Create DEFAULT partition for seo_competitor_keywords
CREATE TABLE IF NOT EXISTS public.seo_competitor_keywords_default 
    PARTITION OF public.seo_competitor_keywords DEFAULT;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_seo_competitor_keywords_project_id ON public.seo_competitor_keywords(project_id);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_keywords_competitor ON public.seo_competitor_keywords(competitor_domain);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_keywords_keyword ON public.seo_competitor_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_keywords_date ON public.seo_competitor_keywords(date);
CREATE INDEX IF NOT EXISTS idx_seo_rank_history_competitor_ranks ON public.seo_rank_history USING gin (competitor_ranks);

-- Enable Row Level Security (RLS)
ALTER TABLE public.seo_competitor_keywords ENABLE ROW LEVEL SECURITY;

-- Security Policies for Workspace access check
CREATE POLICY "Workspace Members View Competitor Keywords" ON public.seo_competitor_keywords
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

CREATE POLICY "Workspace Members Manage Competitor Keywords" ON public.seo_competitor_keywords
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
