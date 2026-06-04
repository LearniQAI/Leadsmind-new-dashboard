-- Migration: Add support for 'hr', 'payroll', and 'viewer' roles in check constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Drop check constraints on public.workspace_members.role
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'workspace_members'
          AND tc.constraint_type = 'CHECK'
          AND ccu.column_name = 'role'
    ) LOOP
        EXECUTE 'ALTER TABLE public.workspace_members DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;

    -- 2. Drop check constraints on public.workspace_invitations.role
    FOR r IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'workspace_invitations'
          AND tc.constraint_type = 'CHECK'
          AND ccu.column_name = 'role'
    ) LOOP
        EXECUTE 'ALTER TABLE public.workspace_invitations DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;

    -- 3. Drop check constraints on public.invitations.role if invitations table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations') THEN
        FOR r IN (
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_schema = 'public'
              AND tc.table_name = 'invitations'
              AND tc.constraint_type = 'CHECK'
              AND ccu.column_name = 'role'
        ) LOOP
            EXECUTE 'ALTER TABLE public.invitations DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        END LOOP;
    END IF;
END $$;

-- Recreate the check constraints with the new roles included
ALTER TABLE public.workspace_members ADD CONSTRAINT workspace_members_role_check CHECK (role IN ('admin', 'member', 'client', 'viewer', 'hr', 'payroll'));
ALTER TABLE public.workspace_invitations ADD CONSTRAINT workspace_invitations_role_check CHECK (role IN ('admin', 'member', 'client', 'viewer', 'hr', 'payroll'));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invitations') THEN
        ALTER TABLE public.invitations ADD CONSTRAINT invitations_role_check CHECK (role IN ('admin', 'member', 'client', 'viewer', 'hr', 'payroll'));
    END IF;
END $$;
