-- Migration: Phase 87 - Content Studio Plagiarism Checker & AI Credits

-- 1. Add ai_credits column to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 100;

-- 2. Create content_plagiarism_checks table
CREATE TABLE IF NOT EXISTS public.content_plagiarism_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.content_studio_documents(id) ON DELETE CASCADE,
    originality_score INTEGER DEFAULT 100,
    plagiarized_score INTEGER DEFAULT 0,
    matches JSONB DEFAULT '[]'::jsonb,
    checked_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_plagiarism_checks ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_plagiarism_checks_document ON public.content_plagiarism_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_content_plagiarism_checks_workspace ON public.content_plagiarism_checks(workspace_id);

-- Policies (Workspace Isolation)
DROP POLICY IF EXISTS "Workspace isolation for content_plagiarism_checks" ON public.content_plagiarism_checks;
CREATE POLICY "Workspace isolation for content_plagiarism_checks" ON public.content_plagiarism_checks FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
