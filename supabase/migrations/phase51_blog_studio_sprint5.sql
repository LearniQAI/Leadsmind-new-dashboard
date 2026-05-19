-- PHASE 51: BLOG VERSION HISTORY & AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.blog_post_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body_html TEXT,
    body_plain TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_post_versions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for secure dashboard access
DROP POLICY IF EXISTS select_post_versions ON public.blog_post_versions;
CREATE POLICY select_post_versions ON public.blog_post_versions FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_post_versions ON public.blog_post_versions;
CREATE POLICY insert_post_versions ON public.blog_post_versions FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS delete_post_versions ON public.blog_post_versions;
CREATE POLICY delete_post_versions ON public.blog_post_versions FOR DELETE USING (true);
