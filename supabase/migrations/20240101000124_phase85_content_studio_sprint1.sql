-- Migration: Phase 85 - Content Studio Infrastructure

-- 1. Content Studio Documents
CREATE TABLE IF NOT EXISTS public.content_studio_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled Document',
    body_html TEXT NOT NULL DEFAULT '',
    body_plain TEXT NOT NULL DEFAULT '',
    content_type TEXT NOT NULL DEFAULT 'blog', -- 'blog', 'social', 'email', 'other'
    target_platform TEXT NOT NULL DEFAULT 'custom', -- 'medium', 'devto', 'twitter', 'linkedin', 'facebook', 'newsletter', 'custom'
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'scheduled', 'archived'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Content Studio Document Version Snapshots
CREATE TABLE IF NOT EXISTS public.content_studio_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.content_studio_documents(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_html TEXT NOT NULL DEFAULT '',
    body_plain TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS
ALTER TABLE public.content_studio_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_studio_document_versions ENABLE ROW LEVEL SECURITY;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_content_studio_docs_workspace ON public.content_studio_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_studio_doc_versions_doc ON public.content_studio_document_versions(document_id);

-- 5. Policies (Workspace Isolation)
DROP POLICY IF EXISTS "Workspace isolation for content_studio_documents" ON public.content_studio_documents;
CREATE POLICY "Workspace isolation for content_studio_documents" ON public.content_studio_documents FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Workspace isolation for content_studio_document_versions" ON public.content_studio_document_versions;
CREATE POLICY "Workspace isolation for content_studio_document_versions" ON public.content_studio_document_versions FOR ALL USING (
    document_id IN (
        SELECT id FROM public.content_studio_documents
        WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
    )
);
