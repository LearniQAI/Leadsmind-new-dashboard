-- Migration: OAuth 2.0 Provider Tables and Schema

-- Create oauth_clients table
CREATE TABLE IF NOT EXISTS public.oauth_clients (
    client_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_secret_hash TEXT NOT NULL,
    redirect_uris TEXT[] NOT NULL,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create oauth_authorization_codes table
CREATE TABLE IF NOT EXISTS public.oauth_authorization_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    redirect_uri TEXT,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create oauth_access_tokens table
CREATE TABLE IF NOT EXISTS public.oauth_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token TEXT UNIQUE NOT NULL,
    refresh_token TEXT UNIQUE,
    client_id TEXT NOT NULL REFERENCES public.oauth_clients(client_id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_access_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for oauth_clients
CREATE POLICY "Workspace members can read oauth clients" ON public.oauth_clients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can insert oauth clients" ON public.oauth_clients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can update oauth clients" ON public.oauth_clients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Workspace members can delete oauth clients" ON public.oauth_clients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.workspace_members wm
            WHERE wm.workspace_id = oauth_clients.workspace_id
            AND wm.user_id = auth.uid()
        )
    );

-- RLS Policies for oauth_authorization_codes
CREATE POLICY "Service role full access to oauth_authorization_codes" ON public.oauth_authorization_codes
    FOR ALL USING (true);

-- RLS Policies for oauth_access_tokens
CREATE POLICY "Service role full access to oauth_access_tokens" ON public.oauth_access_tokens
    FOR ALL USING (true);
