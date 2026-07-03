-- ================================================================
-- Builder Revamp Table Configurations
-- ================================================================

-- 1. WORKSPACE BUILDER SETTINGS
CREATE TABLE IF NOT EXISTS public.workspace_builder_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    settings        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.workspace_builder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for builder settings" ON public.workspace_builder_settings
    FOR ALL USING (check_workspace_access(workspace_id));

-- Trigger
CREATE TRIGGER update_workspace_builder_settings_updated_at 
    BEFORE UPDATE ON public.workspace_builder_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 2. CUSTOM BUILDER COMPONENTS
CREATE TABLE IF NOT EXISTS public.custom_builder_components (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT,
    category        TEXT DEFAULT 'Saved',
    content         JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.custom_builder_components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for custom builder components" ON public.custom_builder_components
    FOR ALL USING (check_workspace_access(workspace_id));

-- Trigger
CREATE TRIGGER update_custom_builder_components_updated_at 
    BEFORE UPDATE ON public.custom_builder_components 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
