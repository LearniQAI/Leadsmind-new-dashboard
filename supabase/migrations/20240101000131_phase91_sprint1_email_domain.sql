-- Sprint 1: Email Campaign Database Extensions & Domain Authentication

-- 1. Extend email_campaigns table
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS preview_text TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_sent INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS opens INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS clicks INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS replied INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS bounces INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS complaints INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;

-- Drop old check constraint and define the updated status set
ALTER TABLE public.email_campaigns DROP CONSTRAINT IF EXISTS email_campaigns_status_check;
ALTER TABLE public.email_campaigns ADD CONSTRAINT email_campaigns_status_check CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'));

-- 2. Create sender_domains configuration table
CREATE TABLE IF NOT EXISTS public.sender_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    domain_name TEXT NOT NULL,
    spf_status BOOLEAN DEFAULT false,
    dkim_status BOOLEAN DEFAULT false,
    dmarc_status BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, domain_name)
);

-- 3. Create email_tracking_logs event logs table
CREATE TABLE IF NOT EXISTS public.email_tracking_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    event_type TEXT CHECK (event_type IN ('open', 'click', 'reply', 'bounce', 'complaint')) NOT NULL,
    link_url TEXT,
    user_agent TEXT,
    ip_address TEXT,
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.sender_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_tracking_logs ENABLE ROW LEVEL SECURITY;

-- Workspace Isolation RLS Policies
DROP POLICY IF EXISTS "Workspace Sender Domains Access" ON public.sender_domains;
CREATE POLICY "Workspace Sender Domains Access" ON public.sender_domains
    FOR ALL USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Workspace Email Tracking Logs Access" ON public.email_tracking_logs;
CREATE POLICY "Workspace Email Tracking Logs Access" ON public.email_tracking_logs
    FOR ALL USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));
