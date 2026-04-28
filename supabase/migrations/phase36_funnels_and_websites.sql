-- ================================================================
-- PHASE 36: Funnels & Websites Infrastructure
-- ================================================================

-- 1. WEBSITES TABLE
CREATE TABLE IF NOT EXISTS public.websites (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    subdomain       TEXT UNIQUE,
    custom_domain   TEXT UNIQUE,
    favicon_url     TEXT,
    is_published    BOOLEAN DEFAULT false,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. FUNNELS TABLE
CREATE TABLE IF NOT EXISTS public.funnels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    subdomain       TEXT UNIQUE,
    custom_domain   TEXT UNIQUE,
    is_published    BOOLEAN DEFAULT false,
    config          JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. WEBSITE PAGES
CREATE TABLE IF NOT EXISTS public.website_pages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id      UUID NOT NULL REFERENCES public.websites(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    path_name       TEXT NOT NULL, -- e.g. '/about'
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(website_id, path_name)
);

-- 4. FUNNEL STEPS
CREATE TABLE IF NOT EXISTS public.funnel_steps (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funnel_id       UUID NOT NULL REFERENCES public.funnels(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    path_name       TEXT NOT NULL, -- e.g. '/offer'
    "order"         INTEGER NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(funnel_id, path_name)
);

-- 5. PAGES (The content container)
CREATE TABLE IF NOT EXISTS public.pages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    website_page_id     UUID REFERENCES public.website_pages(id) ON DELETE CASCADE,
    funnel_step_id      UUID REFERENCES public.funnel_steps(id) ON DELETE CASCADE,
    name                TEXT NOT NULL,
    content             JSONB, -- CraftJS node tree
    preview_image       TEXT,
    is_published        BOOLEAN DEFAULT false,
    is_draft           BOOLEAN DEFAULT true,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now(),
    
    -- Ensure a page belongs to either a website or a funnel
    CONSTRAINT page_context_check CHECK (
        (website_page_id IS NOT NULL AND funnel_step_id IS NULL) OR
        (website_page_id IS NULL AND funnel_step_id IS NOT NULL) OR
        (website_page_id IS NULL AND funnel_step_id IS NULL) -- Solo pages if needed
    )
);

-- 6. PAGE VARIANTS (A/B Testing or Versions)
CREATE TABLE IF NOT EXISTS public.page_variants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    content         JSONB NOT NULL,
    is_main         BOOLEAN DEFAULT false,
    weight          INTEGER DEFAULT 100, -- Traffic percentage
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- 7. PAGE SUBMISSIONS (Leads from forms)
CREATE TABLE IF NOT EXISTS public.page_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    page_id         UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    contact_id      UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    form_data       JSONB NOT NULL DEFAULT '{}',
    metadata        JSONB NOT NULL DEFAULT '{}', -- IP, Browser, etc.
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ----------------------------------------------------------------
-- INDEXES
-- ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_websites_workspace_id ON public.websites(workspace_id);
CREATE INDEX IF NOT EXISTS idx_funnels_workspace_id ON public.funnels(workspace_id);
CREATE INDEX IF NOT EXISTS idx_pages_workspace_id ON public.pages(workspace_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_website_id ON public.website_pages(website_id);
CREATE INDEX IF NOT EXISTS idx_funnel_steps_funnel_id ON public.funnel_steps(funnel_id);
CREATE INDEX IF NOT EXISTS idx_page_variants_page_id ON public.page_variants(page_id);
CREATE INDEX IF NOT EXISTS idx_page_submissions_workspace_id ON public.page_submissions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_page_submissions_contact_id ON public.page_submissions(contact_id);

-- ----------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS)
-- ----------------------------------------------------------------

-- Enable RLS
ALTER TABLE public.websites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.funnel_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_submissions ENABLE ROW LEVEL SECURITY;

-- Helper check_workspace_access should already exist from phase 2
-- Policies

-- Websites
CREATE POLICY "Workspace access for websites" ON public.websites
    FOR ALL USING (check_workspace_access(workspace_id));

-- Funnels
CREATE POLICY "Workspace access for funnels" ON public.funnels
    FOR ALL USING (check_workspace_access(workspace_id));

-- Website Pages (Link through website)
CREATE POLICY "Workspace access for website pages" ON public.website_pages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.websites
            WHERE websites.id = website_pages.website_id
            AND check_workspace_access(websites.workspace_id)
        )
    );

-- Funnel Steps (Link through funnel)
CREATE POLICY "Workspace access for funnel steps" ON public.funnel_steps
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.funnels
            WHERE funnels.id = funnel_steps.funnel_id
            AND check_workspace_access(funnels.workspace_id)
        )
    );

-- Pages
CREATE POLICY "Workspace access for pages" ON public.pages
    FOR ALL USING (check_workspace_access(workspace_id));

-- Page Variants (Link through page)
CREATE POLICY "Workspace access for page variants" ON public.page_variants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.pages
            WHERE pages.id = page_variants.page_id
            AND check_workspace_access(pages.workspace_id)
        )
    );

-- Page Submissions
CREATE POLICY "Workspace access for page submissions" ON public.page_submissions
    FOR ALL USING (check_workspace_access(workspace_id));

-- ----------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------
CREATE TRIGGER update_websites_updated_at BEFORE UPDATE ON public.websites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_funnels_updated_at BEFORE UPDATE ON public.funnels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON public.website_pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_funnel_steps_updated_at BEFORE UPDATE ON public.funnel_steps FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON public.pages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_page_variants_updated_at BEFORE UPDATE ON public.page_variants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------
-- STORAGE BUCKET: pages-media
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('pages-media', 'pages-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for pages-media
CREATE POLICY "Page media is public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'pages-media');

CREATE POLICY "Workspace members can upload page media"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'pages-media' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Workspace members can update page media"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'pages-media' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Workspace members can delete page media"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'pages-media' 
        AND auth.role() = 'authenticated'
    );
