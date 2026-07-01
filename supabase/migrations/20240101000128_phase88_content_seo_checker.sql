-- Migration: Phase 88 - Content Studio SEO Score Checker

-- Create content_seo_checks table
CREATE TABLE IF NOT EXISTS public.content_seo_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.content_studio_documents(id) ON DELETE CASCADE,
    seo_score INTEGER DEFAULT 0,
    target_keyword TEXT,
    secondary_keywords TEXT[] DEFAULT '{}'::text[],
    country_code TEXT,
    metrics_breakdown JSONB DEFAULT '{}'::jsonb,
    checked_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_seo_checks ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_seo_checks_document ON public.content_seo_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_content_seo_checks_workspace ON public.content_seo_checks(workspace_id);

-- Policies (Workspace Isolation)
DROP POLICY IF EXISTS "Workspace isolation for content_seo_checks" ON public.content_seo_checks;
CREATE POLICY "Workspace isolation for content_seo_checks" ON public.content_seo_checks FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
