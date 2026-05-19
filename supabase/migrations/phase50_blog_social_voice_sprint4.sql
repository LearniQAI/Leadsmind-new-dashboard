-- PHASE 50: BLOG SOCIAL MEDIA & VOICE IMPORT TELEMETRY SCHEMA
CREATE TABLE IF NOT EXISTS public.blog_social_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL CHECK (import_type IN ('social', 'voice')),
    source_url TEXT,
    original_text TEXT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    error_message TEXT,
    post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_social_imports ENABLE ROW LEVEL SECURITY;

-- Standard permissive policies
DROP POLICY IF EXISTS select_social_imports ON public.blog_social_imports;
CREATE POLICY select_social_imports ON public.blog_social_imports FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_social_imports ON public.blog_social_imports;
CREATE POLICY insert_social_imports ON public.blog_social_imports FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS update_social_imports ON public.blog_social_imports;
CREATE POLICY update_social_imports ON public.blog_social_imports FOR UPDATE USING (true);

DROP POLICY IF EXISTS delete_social_imports ON public.blog_social_imports;
CREATE POLICY delete_social_imports ON public.blog_social_imports FOR DELETE USING (true);
