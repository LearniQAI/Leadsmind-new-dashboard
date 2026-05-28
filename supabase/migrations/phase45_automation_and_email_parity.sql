-- PHASE 45: AUTOMATION AND EMAIL PARITY
-- Ensures all necessary columns and tables exist for the newly implemented email automations.

-- 1. Ensure workflows table has is_active column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workflows' AND column_name = 'is_active') THEN
        ALTER TABLE public.workflows ADD COLUMN is_active BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 2. Ensure workspaces table has email configuration columns
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'email_from_name') THEN
        ALTER TABLE public.workspaces ADD COLUMN email_from_name TEXT DEFAULT 'LeadsMind';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'email_from_address') THEN
        ALTER TABLE public.workspaces ADD COLUMN email_from_address TEXT DEFAULT 'onboarding@resend.dev';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workspaces' AND column_name = 'resend_api_key') THEN
        ALTER TABLE public.workspaces ADD COLUMN resend_api_key TEXT;
    END IF;
END $$;

-- 3. Ensure tasks table exists and has necessary columns
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    status TEXT DEFAULT 'todo', -- todo, in_progress, done
    due_date DATE,
    due_time TIME,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for tasks if not already enabled
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 4. Ensure RLS policies for tasks
DROP POLICY IF EXISTS "Workspace access for tasks" ON public.tasks;
CREATE POLICY "Workspace access for tasks" ON public.tasks
    FOR ALL
    USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));

-- 5. Ensure leads/contacts have necessary fields for lead capture
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'source') THEN
        ALTER TABLE public.contacts ADD COLUMN source TEXT DEFAULT 'direct';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'metadata') THEN
        ALTER TABLE public.contacts ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- 6. Fix for auth.users vs public.users profile sync
-- Ensure the users table has email, first_name, last_name, etc.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'avatar_url') THEN
        ALTER TABLE public.users ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 7. Ensure unique constraint for social accounts to allow reliable upserts during OAuth
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_social_account') THEN
        ALTER TABLE public.social_accounts ADD CONSTRAINT unique_social_account UNIQUE (workspace_id, platform, account_id);
    END IF;
END $$;

-- 8. Ensure unique constraint for contacts to support API upserts
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_workspace_contact') THEN
        ALTER TABLE public.contacts ADD CONSTRAINT unique_workspace_contact UNIQUE (workspace_id, email);
    END IF;
END $$;
                                                                                                                                           