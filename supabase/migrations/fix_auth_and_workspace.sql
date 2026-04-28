-- ================================================================
-- LeadsMind: Auth & Workspace Fix Migration
-- Run this in your Supabase SQL Editor
-- ================================================================

-- ----------------------------------------------------------------
-- 1. USERS TABLE (public profile mirror of auth.users)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email       TEXT NOT NULL,
    first_name  TEXT NOT NULL DEFAULT '',
    last_name   TEXT NOT NULL DEFAULT '',
    avatar_url  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- ----------------------------------------------------------------
-- 2. WORKSPACES TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspaces (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    logo_url    TEXT,
    owner_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members can view their workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update their workspace" ON public.workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete their workspace" ON public.workspaces;

CREATE POLICY "Workspace members can view their workspace"
    ON public.workspaces FOR SELECT
    USING (
        id IN (
            SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create workspaces"
    ON public.workspaces FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update their workspace"
    ON public.workspaces FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspace"
    ON public.workspaces FOR DELETE
    USING (owner_id = auth.uid());

-- ----------------------------------------------------------------
-- 3. WORKSPACE MEMBERS TABLE
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id    UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'client')),
    joined_at       TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert their own membership" ON public.workspace_members;

CREATE POLICY "Users can view their own memberships"
    ON public.workspace_members FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Workspace admins can view all memberships"
    ON public.workspace_members FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Users can insert their own membership"
    ON public.workspace_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workspace admins can manage memberships"
    ON public.workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT workspace_id FROM public.workspace_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- ----------------------------------------------------------------
-- 4. AUTO-CREATE USER PROFILE ON AUTH SIGNUP (Trigger)
--    This is the most reliable approach — runs server-side
--    automatically and doesn't depend on client-side success.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    v_full_name TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_workspace_name TEXT;
    v_workspace_id UUID;
    v_slug TEXT;
    v_base_slug TEXT;
    v_counter INT := 0;
BEGIN
    -- Extract name from metadata
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
    );
    v_first_name := split_part(v_full_name, ' ', 1);
    v_last_name := COALESCE(
        NULLIF(substring(v_full_name from position(' ' in v_full_name) + 1), ''),
        ''
    );

    -- 1. Create user profile (upsert to be safe)
    INSERT INTO public.users (id, email, first_name, last_name, created_at)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name, now())
    ON CONFLICT (id) DO NOTHING;

    -- 2. Create default workspace
    v_workspace_name := v_full_name || '''s Workspace';
    v_base_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_base_slug := substr(v_base_slug, 1, 40);
    v_slug := v_base_slug;

    -- Handle slug uniqueness
    LOOP
        BEGIN
            INSERT INTO public.workspaces (name, slug, owner_id, plan)
            VALUES (v_workspace_name, v_slug, NEW.id, 'free')
            RETURNING id INTO v_workspace_id;
            EXIT; -- success, break loop
        EXCEPTION WHEN unique_violation THEN
            v_counter := v_counter + 1;
            v_slug := v_base_slug || '-' || v_counter;
        END;
    END LOOP;

    -- 3. Add user as admin of their workspace
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Attach trigger (drop first to be idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- 5. WORKSPACE LOGO STORAGE BUCKET
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-logos', 'workspace-logos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workspace logos are publicly readable"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'workspace-logos');

CREATE POLICY "Authenticated users can upload workspace logos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can update workspace logos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');

CREATE POLICY "Owners can delete workspace logos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'workspace-logos' AND auth.role() = 'authenticated');

-- ----------------------------------------------------------------
-- 6. BACKFILL: Create missing profiles/workspaces for existing users
-- ----------------------------------------------------------------
DO $$
DECLARE
    auth_user RECORD;
    v_full_name TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
    v_workspace_name TEXT;
    v_workspace_id UUID;
    v_slug TEXT;
    v_base_slug TEXT;
    v_counter INT;
BEGIN
    FOR auth_user IN SELECT * FROM auth.users LOOP
        -- Create missing user profiles
        INSERT INTO public.users (id, email, first_name, last_name)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(split_part(auth_user.raw_user_meta_data->>'full_name', ' ', 1), split_part(auth_user.email, '@', 1)),
            COALESCE(NULLIF(substring(COALESCE(auth_user.raw_user_meta_data->>'full_name', '') from position(' ' in COALESCE(auth_user.raw_user_meta_data->>'full_name', '')) + 1), ''), '')
        )
        ON CONFLICT (id) DO NOTHING;

        -- Create missing workspaces (if user has no workspace)
        IF NOT EXISTS (SELECT 1 FROM public.workspace_members WHERE user_id = auth_user.id) THEN
            v_full_name := COALESCE(auth_user.raw_user_meta_data->>'full_name', split_part(auth_user.email, '@', 1));
            v_workspace_name := v_full_name || '''s Workspace';
            v_base_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
            v_base_slug := substr(v_base_slug, 1, 40);
            v_slug := v_base_slug;
            v_counter := 0;

            LOOP
                BEGIN
                    INSERT INTO public.workspaces (name, slug, owner_id, plan)
                    VALUES (v_workspace_name, v_slug, auth_user.id, 'free')
                    RETURNING id INTO v_workspace_id;
                    EXIT;
                EXCEPTION WHEN unique_violation THEN
                    v_counter := v_counter + 1;
                    v_slug := v_base_slug || '-' || v_counter;
                END;
            END LOOP;

            INSERT INTO public.workspace_members (workspace_id, user_id, role)
            VALUES (v_workspace_id, auth_user.id, 'admin')
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;
