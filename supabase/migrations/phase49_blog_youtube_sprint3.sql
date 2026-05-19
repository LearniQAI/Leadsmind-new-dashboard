-- PHASE 49: BLOG YOUTUBE IMPORT SYSTEM
CREATE TABLE IF NOT EXISTS public.blog_import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    video_url TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_title TEXT,
    video_thumbnail TEXT,
    status TEXT NOT NULL CHECK (status IN ('queued', 'transcribing', 'generating', 'completed', 'failed')),
    error_message TEXT,
    post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
    whisper_cost_usd NUMERIC(10, 4) DEFAULT 0.0000,
    gpt_cost_usd NUMERIC(10, 4) DEFAULT 0.0000,
    zar_cost NUMERIC(10, 4) DEFAULT 0.0000,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_import_jobs ENABLE ROW LEVEL SECURITY;

-- Setup basic permissive RLS policies
DROP POLICY IF EXISTS select_import_jobs ON public.blog_import_jobs;
CREATE POLICY select_import_jobs ON public.blog_import_jobs FOR SELECT USING (true);

DROP POLICY IF EXISTS insert_import_jobs ON public.blog_import_jobs;
CREATE POLICY insert_import_jobs ON public.blog_import_jobs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS update_import_jobs ON public.blog_import_jobs;
CREATE POLICY update_import_jobs ON public.blog_import_jobs FOR UPDATE USING (true);

DROP POLICY IF EXISTS delete_import_jobs ON public.blog_import_jobs;
CREATE POLICY delete_import_jobs ON public.blog_import_jobs FOR DELETE USING (true);
