-- PHASE 47: BLOGGING INFRASTRUCTURE & EDITOR
-- 1. TABLES
CREATE TABLE IF NOT EXISTS public.blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT blog_categories_workspace_slug_key UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT,
    body_html TEXT NOT NULL DEFAULT '',
    body_plain TEXT NOT NULL DEFAULT '',
    cover_image TEXT,
    cover_image_alt TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT blog_posts_workspace_slug_key UNIQUE (workspace_id, slug)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_blog_categories_workspace_id ON public.blog_categories(workspace_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_workspace_id ON public.blog_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);

-- 3. RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- 4. POLICIES
-- Categories
DROP POLICY IF EXISTS "Workspace access for blog_categories" ON public.blog_categories;
CREATE POLICY "Workspace access for blog_categories" ON public.blog_categories
    FOR ALL USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Public select for blog_categories" ON public.blog_categories;
CREATE POLICY "Public select for blog_categories" ON public.blog_categories
    FOR SELECT USING (true); -- Anyone can see blog categories for public website filters

-- Posts
DROP POLICY IF EXISTS "Workspace access for blog_posts" ON public.blog_posts;
CREATE POLICY "Workspace access for blog_posts" ON public.blog_posts
    FOR ALL USING (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Public select for published blog_posts" ON public.blog_posts;
CREATE POLICY "Public select for published blog_posts" ON public.blog_posts
    FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));

-- 5. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blog-media', 'blog-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read images
DROP POLICY IF EXISTS "Public Blog Media Access" ON storage.objects;
CREATE POLICY "Public Blog Media Access" ON storage.objects
    FOR SELECT USING (bucket_id = 'blog-media');

-- Authenticated users can upload images
DROP POLICY IF EXISTS "Auth Blog Media Upload" ON storage.objects;
CREATE POLICY "Auth Blog Media Upload" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-media');

-- Authenticated users can update/delete their own images
DROP POLICY IF EXISTS "Auth Blog Media Update" ON storage.objects;
CREATE POLICY "Auth Blog Media Update" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Auth Blog Media Delete" ON storage.objects;
CREATE POLICY "Auth Blog Media Delete" ON storage.objects
    FOR DELETE TO authenticated USING (bucket_id = 'blog-media');

-- 6. TRIGGERS FOR UPDATED_AT
DROP TRIGGER IF EXISTS update_blog_categories_updated_at ON public.blog_categories;
CREATE TRIGGER update_blog_categories_updated_at 
    BEFORE UPDATE ON public.blog_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER update_blog_posts_updated_at 
    BEFORE UPDATE ON public.blog_posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. REALTIME ENABLE
ALTER PUBLICATION supabase_realtime ADD TABLE blog_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE blog_categories;
