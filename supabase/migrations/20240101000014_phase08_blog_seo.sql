-- ================================================================
-- PHASE 8: Blog Builder Schema & Metadata
-- ================================================================

-- 1. ENRICH PAGES FOR BLOGGING
ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'page', -- funnel_step, website_page, landing_page, blog_post
ADD COLUMN IF NOT EXISTS author TEXT,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS read_time INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS excerpt TEXT,
ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. ADD VIEWS TRACKING
ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;

-- 3. ADD SEO METADATA (If missing from previous phases)
ALTER TABLE public.pages
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- 4. RLS POLICIES FOR PUBLIC ACCESS (Reading published pages)
-- This allows anyone to read pages that are marked as published
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'pages' AND policyname = 'Anyone can view published pages'
    ) THEN
        CREATE POLICY "Anyone can view published pages"
        ON public.pages FOR SELECT
        USING (is_published = true);
    END IF;
END $$;
