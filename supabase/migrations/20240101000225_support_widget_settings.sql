-- Create support_widget_settings table
CREATE TABLE IF NOT EXISTS public.support_widget_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    widget_key TEXT UNIQUE NOT NULL DEFAULT encode(sha256(random()::text::bytea), 'hex'),
    welcome_message TEXT DEFAULT 'How can we help you today?',
    brand_color TEXT DEFAULT '#2563eb',
    logo_url TEXT,
    departments JSONB DEFAULT '[]'::jsonb,
    categories JSONB DEFAULT '[]'::jsonb,
    notification_preferences JSONB DEFAULT '{"email": true, "in_app": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.support_widget_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view widget settings in their workspace"
    ON public.support_widget_settings FOR SELECT
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can insert widget settings in their workspace"
    ON public.support_widget_settings FOR INSERT
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can update widget settings in their workspace"
    ON public.support_widget_settings FOR UPDATE
    USING (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ))
    WITH CHECK (workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ));

-- Trigger for updated_at
CREATE TRIGGER update_support_widget_settings_updated_at
    BEFORE UPDATE ON public.support_widget_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
