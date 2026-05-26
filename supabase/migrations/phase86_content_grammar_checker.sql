-- Migration: Phase 86 - Content Studio Grammar & Style Checker

CREATE TABLE IF NOT EXISTS public.content_grammar_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.content_studio_documents(id) ON DELETE CASCADE,
    issues_found INTEGER DEFAULT 0,
    score INTEGER DEFAULT 100,
    readability_grade TEXT,
    detected_tone TEXT,
    checked_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_grammar_checks ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_grammar_checks_document ON public.content_grammar_checks(document_id);
CREATE INDEX IF NOT EXISTS idx_content_grammar_checks_workspace ON public.content_grammar_checks(workspace_id);

-- Policies (Workspace Isolation)
DROP POLICY IF EXISTS "Workspace isolation for content_grammar_checks" ON public.content_grammar_checks;
CREATE POLICY "Workspace isolation for content_grammar_checks" ON public.content_grammar_checks FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);
