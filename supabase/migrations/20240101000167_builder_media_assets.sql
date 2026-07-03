-- ================================================================
-- Builder Media Assets Table Configurations
-- ================================================================

CREATE TABLE IF NOT EXISTS public.builder_media_assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    url             TEXT NOT NULL,
    filename        TEXT NOT NULL,
    size_bytes      BIGINT NOT NULL,
    mime_type       TEXT NOT NULL,
    label           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.builder_media_assets ENABLE ROW LEVEL SECURITY;

-- Workspace access policy
CREATE POLICY "Workspace access for builder media assets" ON public.builder_media_assets
    FOR ALL USING (check_workspace_access(workspace_id));

-- Auto update updated_at trigger
CREATE TRIGGER update_builder_media_assets_updated_at 
    BEFORE UPDATE ON public.builder_media_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
