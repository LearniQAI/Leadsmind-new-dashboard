-- Add page type and blog support
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'blog_post', 'template')),
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Add grouping for templates
CREATE TABLE IF NOT EXISTS public.templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    preview_image   TEXT,
    content         JSONB NOT NULL,
    category        TEXT DEFAULT 'general',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS for templates (Publicly readable)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Templates are public" ON public.templates FOR SELECT USING (true);
