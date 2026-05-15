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

-- 0. HELPER TO BREAK RECURSION
CREATE OR REPLACE FUNCTION public.get_user_workspaces()
RETURNS TABLE(workspace_id UUID) 
LANGUAGE sql 
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid();
$$;

-- 1. USERS TABLE VISIBILITY
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view profiles of workspace teammates" ON public.users;
DROP POLICY IF EXISTS "Teammate visibility" ON public.users;

CREATE POLICY "Teammate visibility"
    ON public.users FOR SELECT
    USING (
        id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM workspace_members m 
            WHERE m.user_id = auth.uid() 
            AND m.workspace_id IN (SELECT mw.workspace_id FROM workspace_members mw WHERE mw.user_id = public.users.id)
        )
    );

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
DROP POLICY IF EXISTS "Workspace visibility" ON public.workspaces;

CREATE POLICY "Workspace visibility"
    ON public.workspaces FOR SELECT
    USING (
        id IN (SELECT public.get_user_workspaces())
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
DROP POLICY IF EXISTS "Workspace admins can view all memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can view fellow workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members visibility" ON public.workspace_members;

CREATE POLICY "Workspace members visibility"
    ON public.workspace_members FOR SELECT
    USING (
        user_id = auth.uid() OR
        workspace_id IN (SELECT public.get_user_workspaces())
    );

CREATE POLICY "Users can insert their own membership"
    ON public.workspace_members FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workspace admins can manage memberships"
    ON public.workspace_members FOR ALL
    USING (
        workspace_id IN (
            SELECT m.workspace_id FROM public.workspace_members m
            WHERE m.user_id = auth.uid() AND m.role = 'admin'
        )
    );

-- ----------------------------------------------------------------
-- 4. AUTO-CREATE USER PROFILE ON AUTH SIGNUP (Trigger)
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

    INSERT INTO public.users (id, email, first_name, last_name, created_at)
    VALUES (NEW.id, NEW.email, v_first_name, v_last_name, now())
    ON CONFLICT (id) DO NOTHING;

    v_workspace_name := v_full_name || '''s Workspace';
    v_base_slug := lower(regexp_replace(v_full_name, '[^a-zA-Z0-9]', '-', 'g'));
    v_slug := v_base_slug;

    LOOP
        BEGIN
            INSERT INTO public.workspaces (name, slug, owner_id, plan)
            VALUES (v_workspace_name, v_slug, NEW.id, 'free')
            RETURNING id INTO v_workspace_id;
            EXIT;
        EXCEPTION WHEN unique_violation THEN
            v_counter := v_counter + 1;
            v_slug := v_base_slug || '-' || v_counter;
        END;
    END LOOP;

    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, NEW.id, 'admin')
    ON CONFLICT (workspace_id, user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------
-- 5. STORAGE BUCKETS
-- ----------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('workspace-logos', 'workspace-logos', true)
ON CONFLICT (id) DO NOTHING;
