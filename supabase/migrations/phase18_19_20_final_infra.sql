-- PHASE 18: INTEGRATIONS, API & WEBHOOKS

-- API Keys
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    scopes TEXT[],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook Endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    events TEXT[],
    secret TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    failure_count INTEGER DEFAULT 0,
    last_success_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Webhook Deliveries
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_id UUID REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    event_type TEXT,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    attempt INTEGER DEFAULT 1,
    delivered_at TIMESTAMPTZ
);

-- PHASE 19: MULTI-LOCATION, CLIENT PORTAL & ONBOARDING

-- Location Groups
CREATE TABLE IF NOT EXISTS public.location_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Locations
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.location_groups(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE, -- Each location IS a workspace
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    timezone TEXT,
    google_place_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Onboarding Progress
CREATE TABLE IF NOT EXISTS public.onboarding_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    completed_steps TEXT[],
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PHASE 20: ADVANCED SAAS MODE, SNAPSHOTS & COMPLIANCE

-- SaaS Plans
CREATE TABLE IF NOT EXISTS public.saas_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE, -- Reseller's workspace
    name TEXT NOT NULL,
    price_monthly NUMERIC,
    price_annual NUMERIC,
    features TEXT[],
    max_users INTEGER,
    max_contacts INTEGER,
    stripe_price_id_monthly TEXT,
    stripe_price_id_annual TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Snapshots
CREATE TABLE IF NOT EXISTS public.snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    content JSONB NOT NULL DEFAULT '{}',
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- GDPR Requests
CREATE TABLE IF NOT EXISTS public.gdpr_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    type TEXT CHECK (type IN ('access', 'deletion', 'portability', 'rectification')),
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')) DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    response_url TEXT,
    notes TEXT
);

-- Identity Verifications
CREATE TABLE IF NOT EXISTS public.identity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'verified', 'failed', 'expired')) DEFAULT 'pending',
    provider TEXT,
    session_id TEXT,
    verified_at TIMESTAMPTZ,
    document_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES FOR PHASES 18, 19 & 20
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_verifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- API Keys
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace API Keys Access') THEN
        CREATE POLICY "Workspace API Keys Access" ON public.api_keys
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Locations
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Locations Access') THEN
        CREATE POLICY "Workspace Locations Access" ON public.locations
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- SaaS Plans
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace SaaS Plans Access') THEN
        CREATE POLICY "Workspace SaaS Plans Access" ON public.saas_plans
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;
END $$;
