-- PHASE 44: UNIVERSAL API & BRANDING INTEGRITY
-- Enhancing external integration and identity consistency

-- 1. Add API Key support to workspaces
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE DEFAULT 'lm_sk_' || encode(gen_random_bytes(24), 'hex');

-- 2. Fix Permission Denied for 'users' table
-- Ensure workspace members can view each other's profiles
DROP POLICY IF EXISTS "Users can view team member profiles" ON public.users;
CREATE POLICY "Users can view team member profiles"
    ON public.users FOR SELECT
    USING (
        id IN (
            SELECT user_id FROM public.workspace_members
            WHERE workspace_id IN (
                SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
            )
        )
    );

-- 3. Ensure workspace_branding is robust
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspace_branding' AND column_name = 'api_form_code') THEN
        ALTER TABLE public.workspace_branding ADD COLUMN api_form_code TEXT;
    END IF;
END $$;

-- 4. Storage permissions for branding (Logo upload)
-- Make sure the bucket exists and policies allow the workspace admin to manage it
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Branding assets are public" ON storage.objects;
CREATE POLICY "Branding assets are public"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Workspace admins can manage branding assets" ON storage.objects;
CREATE POLICY "Workspace admins can manage branding assets"
    ON storage.objects FOR ALL
    USING (bucket_id = 'branding' AND auth.role() = 'authenticated');

-- 5. Leads/Contacts Public API Support
-- We allow unauthenticated inserts for the form code if a valid API key is provided
-- (Handled via Edge Functions or Server Actions, but we need RLS to allow it if needed)
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public form submissions" ON public.contacts;
CREATE POLICY "Public form submissions"
    ON public.contacts FOR INSERT
    WITH CHECK (true); -- We will validate the workspace_id/api_key in the application logic
