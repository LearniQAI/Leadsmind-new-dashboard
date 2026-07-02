-- ================================================================
-- Builder Published Domains & Form Submissions Configurations
-- ================================================================

-- 1. BUILDER PUBLISHED DOMAINS
CREATE TABLE IF NOT EXISTS public.builder_published_domains (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id        UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    website_id          UUID REFERENCES public.websites(id) ON DELETE CASCADE,
    domain_name         TEXT NOT NULL UNIQUE,
    ssl_status          TEXT NOT NULL DEFAULT 'pending' CHECK (ssl_status IN ('pending', 'active', 'error')),
    verified            BOOLEAN DEFAULT false,
    verification_token  TEXT,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.builder_published_domains ENABLE ROW LEVEL SECURITY;

-- Workspace access policies
CREATE POLICY "Workspace access for builder published domains" ON public.builder_published_domains
    FOR ALL USING (check_workspace_access(workspace_id));

-- Trigger for updated_at
CREATE TRIGGER update_builder_published_domains_updated_at
    BEFORE UPDATE ON public.builder_published_domains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexing
CREATE INDEX IF NOT EXISTS idx_published_domains_hostname ON public.builder_published_domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_published_domains_ws ON public.builder_published_domains(workspace_id);


-- 2. BUILDER FORM SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.builder_form_submissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    page_id         UUID REFERENCES public.pages(id) ON DELETE SET NULL,
    form_id         TEXT,
    payload         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.builder_form_submissions ENABLE ROW LEVEL SECURITY;

-- Workspace access policy for read/delete
CREATE POLICY "Workspace access for builder form submissions" ON public.builder_form_submissions
    FOR ALL USING (check_workspace_access(workspace_id));

-- Public write access so live custom sites can submit forms without authentication
CREATE POLICY "Public write access for builder form submissions" ON public.builder_form_submissions
    FOR INSERT WITH CHECK (true);

-- Indexing
CREATE INDEX IF NOT EXISTS idx_builder_form_subs_page ON public.builder_form_submissions(page_id);
CREATE INDEX IF NOT EXISTS idx_builder_form_subs_ws ON public.builder_form_submissions(workspace_id);
