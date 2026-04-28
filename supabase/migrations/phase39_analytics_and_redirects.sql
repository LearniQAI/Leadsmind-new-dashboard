-- Redirects Table
CREATE TABLE IF NOT EXISTS public.redirects (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    source_path     TEXT NOT NULL,
    target_url      TEXT NOT NULL,
    status_code     INTEGER DEFAULT 301 CHECK (status_code IN (301, 302, 307, 308)),
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, source_path)
);

-- Index for fast lookup in middleware
CREATE INDEX IF NOT EXISTS idx_redirects_lookup ON public.redirects(workspace_id, source_path) WHERE is_active = true;

-- Page Views / Analytics
CREATE TABLE IF NOT EXISTS public.page_analytics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    page_id         UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
    variant_id      UUID REFERENCES public.page_variants(id) ON DELETE SET NULL,
    visitor_id      TEXT NOT NULL,
    event_type      TEXT DEFAULT 'view' CHECK (event_type IN ('view', 'click', 'submit')),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_page_analytics_page_id ON public.page_analytics(page_id, created_at);
