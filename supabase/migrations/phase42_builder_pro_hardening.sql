-- ================================================================
-- PHASE 42: Builder Pro Hardening (SEO, Versions, Custom Domains)
-- ================================================================

-- 1. ADD SEO COLUMNS TO PAGES
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS seo_title TEXT,
ADD COLUMN IF NOT EXISTS seo_description TEXT,
ADD COLUMN IF NOT EXISTS og_image_url TEXT,
ADD COLUMN IF NOT EXISTS rendered_html TEXT,
ADD COLUMN IF NOT EXISTS last_auto_save_at TIMESTAMPTZ;

-- 2. CREATE PAGE VERSIONS TABLE (For Rollbacks)
CREATE TABLE IF NOT EXISTS public.page_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id         UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL, -- e.g. "v1 - Before big change"
    content         JSONB NOT NULL,
    is_published_version BOOLEAN DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. ENHANCE WEBSITES FOR CUSTOM DOMAINS & SSL
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS domain_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_token TEXT,
ADD COLUMN IF NOT EXISTS ssl_status TEXT DEFAULT 'pending'; -- 'pending', 'active', 'error'

-- 4. RLS FOR PAGE VERSIONS
ALTER TABLE public.page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for page versions" ON public.page_versions
    FOR ALL USING (check_workspace_access(workspace_id));

-- 5. FUNCTION TO AUTO-SAVE VERSION ON PUBLISH
CREATE OR REPLACE FUNCTION public.archive_page_version()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.is_published = false AND NEW.is_published = true) OR (OLD.content != NEW.content AND NEW.is_published = true) THEN
        INSERT INTO public.page_versions (page_id, workspace_id, name, content, is_published_version)
        VALUES (NEW.id, NEW.workspace_id, 'Auto-archive on Publish ' || now(), NEW.content, true);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_archive_version_on_publish
AFTER UPDATE ON public.pages
FOR EACH ROW
EXECUTE FUNCTION public.archive_page_version();

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_page_versions_page_id ON public.page_versions(page_id);
CREATE INDEX IF NOT EXISTS idx_websites_custom_domain ON public.websites(custom_domain);
