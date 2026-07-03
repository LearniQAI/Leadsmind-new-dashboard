-- PHASE 16: ADVANCED REPORTING & ATTRIBUTION

-- Contact Touchpoints Table
CREATE TABLE IF NOT EXISTS public.contact_touchpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('page_view', 'form_submit', 'email_open', 'email_click', 'ad_click', 'call', 'appointment', 'purchase')),
    source TEXT,
    campaign TEXT,
    medium TEXT,
    content_id UUID,
    value NUMERIC DEFAULT 0,
    occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Saved Reports Table
CREATE TABLE IF NOT EXISTS public.saved_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- PHASE 17: TEAM, PROJECTS & SUPPORT

-- Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL, -- Linked client
    status TEXT CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled')) DEFAULT 'planning',
    due_date TIMESTAMPTZ,
    description TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Project Tasks
CREATE TABLE IF NOT EXISTS public.project_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    status TEXT CHECK (status IN ('todo', 'in_progress', 'review', 'done')) DEFAULT 'todo',
    assigned_to UUID REFERENCES auth.users(id),
    due_date TIMESTAMPTZ,
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Proposals Table
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL DEFAULT '{}',
    total_value NUMERIC,
    status TEXT CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'declined', 'expired')) DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    signature_data TEXT, -- Base64
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK (priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    status TEXT CHECK (status IN ('open', 'in_progress', 'waiting_client', 'resolved', 'closed')) DEFAULT 'open',
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS public.knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT, -- Markdown
    category TEXT,
    status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
    views INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS POLICIES FOR PHASES 16 & 17
ALTER TABLE public.contact_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Attribution/Reports
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Attribution Access') THEN
        CREATE POLICY "Workspace Attribution Access" ON public.contact_touchpoints
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Projects
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Projects Access') THEN
        CREATE POLICY "Workspace Projects Access" ON public.projects
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Proposals
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Proposals Access') THEN
        CREATE POLICY "Workspace Proposals Access" ON public.proposals
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;

    -- Tickets
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Workspace Tickets Access') THEN
        CREATE POLICY "Workspace Tickets Access" ON public.support_tickets
            FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));
    END IF;
END $$;
