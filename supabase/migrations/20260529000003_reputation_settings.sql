-- Create reputation_settings table
CREATE TABLE IF NOT EXISTS public.reputation_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID UNIQUE NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    google_review_url TEXT,
    facebook_review_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reputation_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view reputation settings in their workspace') THEN
        CREATE POLICY "Users can view reputation settings in their workspace"
            ON public.reputation_settings FOR SELECT
            USING (workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert reputation settings in their workspace') THEN
        CREATE POLICY "Users can insert reputation settings in their workspace"
            ON public.reputation_settings FOR INSERT
            WITH CHECK (workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update reputation settings in their workspace') THEN
        CREATE POLICY "Users can update reputation settings in their workspace"
            ON public.reputation_settings FOR UPDATE
            USING (workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            ))
            WITH CHECK (workspace_id IN (
                SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
            ));
    END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_reputation_settings_updated_at ON public.reputation_settings;
CREATE TRIGGER update_reputation_settings_updated_at
    BEFORE UPDATE ON public.reputation_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
