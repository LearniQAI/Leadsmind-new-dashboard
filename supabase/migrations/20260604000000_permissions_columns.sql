-- Migration: Add permissions column to workspace_members and workspace_invitations if not exists
DO $$
BEGIN
    -- 1. Check/Add permissions to public.workspace_members
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'workspace_members' 
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE public.workspace_members ADD COLUMN permissions TEXT[] DEFAULT '{}'::TEXT[];
        RAISE NOTICE 'Added permissions column to workspace_members';
    END IF;

    -- 2. Check/Add permissions to public.workspace_invitations
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'workspace_invitations' 
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE public.workspace_invitations ADD COLUMN permissions TEXT[] DEFAULT '{}'::TEXT[];
        RAISE NOTICE 'Added permissions column to workspace_invitations';
    END IF;
END $$;
