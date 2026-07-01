-- Migration: Phase 78 - Unified CRM Infrastructure

-- 1. Unified Companies
CREATE TABLE IF NOT EXISTS public.crm_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    domain TEXT,
    industry TEXT,
    employees TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    source TEXT, -- 'leads_finder', 'form_submission', 'manual'
    lead_score INTEGER DEFAULT 0,
    opportunity_score INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Unified Contacts
CREATE TABLE IF NOT EXISTS public.crm_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    linkedin_url TEXT,
    source TEXT, -- 'leads_finder', 'form_submission', 'manual'
    status TEXT DEFAULT 'New', -- 'New', 'Contacted', 'Qualified', 'Unqualified'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, email) -- prevent exact email duplicates per workspace
);

-- 3. Unified Opportunities (Pipelines)
CREATE TABLE IF NOT EXISTS public.crm_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.crm_companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    pipeline_id TEXT NOT NULL DEFAULT 'default',
    stage_id TEXT NOT NULL DEFAULT 'new',
    name TEXT NOT NULL,
    amount NUMERIC(12,2) DEFAULT 0.00,
    probability INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Open', -- 'Open', 'Won', 'Lost'
    expected_close_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Unified Activities
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type TEXT NOT NULL, -- 'contact', 'company', 'opportunity', 'form'
    entity_id UUID NOT NULL,
    activity_type TEXT NOT NULL, -- 'note', 'call', 'email', 'stage_change', 'imported', 'merged'
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Entity Merge Candidates
CREATE TABLE IF NOT EXISTS public.entity_merge_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'contact', 'company'
    primary_entity_id UUID NOT NULL,
    duplicate_entity_id UUID NOT NULL,
    confidence_score INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'Pending', -- 'Pending', 'Merged', 'Rejected'
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. CRM Notifications
CREATE TABLE IF NOT EXISTS public.crm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'alert', 'assignment', 'submission', 'opportunity'
    reference_id UUID,
    reference_type TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.crm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_merge_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notifications ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_crm_contacts_workspace ON public.crm_contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_companies_workspace ON public.crm_companies(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_opportunities_workspace ON public.crm_opportunities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_entity ON public.crm_activities(entity_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_crm_notifications_user ON public.crm_notifications(user_id, is_read);

-- Policies (Workspace Isolation)
CREATE POLICY "Workspace isolation for crm_companies" ON public.crm_companies FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for crm_contacts" ON public.crm_contacts FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for crm_opportunities" ON public.crm_opportunities FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for crm_activities" ON public.crm_activities FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Workspace isolation for entity_merge_candidates" ON public.entity_merge_candidates FOR ALL USING (
    workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())
);

CREATE POLICY "Users view own notifications" ON public.crm_notifications FOR ALL USING (
    user_id = auth.uid()
);
