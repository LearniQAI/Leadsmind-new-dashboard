-- PHASE 9: EMAIL CAMPAIGNS & BROADCASTS

-- Email Templates Table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_json JSONB,
    type TEXT CHECK (type IN ('broadcast', 'sequence', 'transactional')) DEFAULT 'broadcast',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS public.email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    template_id UUID REFERENCES public.email_templates(id),
    subject TEXT NOT NULL,
    from_name TEXT,
    from_email TEXT,
    segment JSONB, -- Filter rules defining recipient list
    status TEXT CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'cancelled')) DEFAULT 'draft',
    scheduled_for TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    recipient_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign Stats Table (1:1 with campaign for easy querying)
CREATE TABLE IF NOT EXISTS public.campaign_stats (
    campaign_id UUID PRIMARY KEY REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    spam_reported INTEGER DEFAULT 0
);

-- Email Events Table (Detailed logs)
CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    event_type TEXT CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'bounced', 'unsubscribed', 'spam')),
    link_url TEXT,
    occurred_at TIMESTAMPTZ DEFAULT now()
);

-- Unsubscribes Table
CREATE TABLE IF NOT EXISTS public.unsubscribes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    unsubscribed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, email)
);

-- PHASE 10: FORMS, SURVEYS & LEAD CAPTURE

-- 1. Ensure columns exist on public.forms (handling legacy schema from Phase 8)
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('form', 'survey')) DEFAULT 'form';
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('draft', 'published')) DEFAULT 'draft';
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS submission_count INTEGER DEFAULT 0;

-- 2. Create the table if it truly doesn't exist (e.g. fresh environment)
CREATE TABLE IF NOT EXISTS public.forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'form',
    fields JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    status TEXT DEFAULT 'draft',
    submission_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Form Submissions Table
CREATE TABLE IF NOT EXISTS public.form_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES public.forms(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
    data JSONB NOT NULL,
    source_url TEXT,
    ip_address TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for all new tables
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unsubscribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_submissions ENABLE ROW LEVEL SECURITY;

-- Workspace-based RLS Policies
-- Templates
DROP POLICY IF EXISTS "Workspace Templates Access" ON public.email_templates;
CREATE POLICY "Workspace Templates Access" ON public.email_templates
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Campaigns
DROP POLICY IF EXISTS "Workspace Campaigns Access" ON public.email_campaigns;
CREATE POLICY "Workspace Campaigns Access" ON public.email_campaigns
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Stats
DROP POLICY IF EXISTS "Workspace Stats Access" ON public.campaign_stats;
CREATE POLICY "Workspace Stats Access" ON public.campaign_stats
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Events
DROP POLICY IF EXISTS "Workspace Events Access" ON public.email_events;
CREATE POLICY "Workspace Events Access" ON public.email_events
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Unsubscribes
DROP POLICY IF EXISTS "Workspace Unsubscribes Access" ON public.unsubscribes;
CREATE POLICY "Workspace Unsubscribes Access" ON public.unsubscribes
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Forms
DROP POLICY IF EXISTS "Workspace Forms Access" ON public.forms;
CREATE POLICY "Workspace Forms Access" ON public.forms
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Submissions
DROP POLICY IF EXISTS "Workspace Submissions Access" ON public.form_submissions;
CREATE POLICY "Workspace Submissions Access" ON public.form_submissions
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Public policy for form rendering (Only SELECT published forms, and INSERT submissions)
DROP POLICY IF EXISTS "Public Form Select" ON public.forms;
CREATE POLICY "Public Form Select" ON public.forms
    FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Public Form Submit" ON public.form_submissions;
CREATE POLICY "Public Form Submit" ON public.form_submissions
    FOR INSERT WITH CHECK (true);

-- Functions to update counts
CREATE OR REPLACE FUNCTION public.update_campaign_recipient_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.email_campaigns
    SET recipient_count = NEW.sent
    FROM public.campaign_stats
    WHERE public.email_campaigns.id = NEW.campaign_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS campaign_stats_update_trigger ON public.campaign_stats;
CREATE TRIGGER campaign_stats_update_trigger
AFTER UPDATE OF sent ON public.campaign_stats
FOR EACH ROW EXECUTE FUNCTION public.update_campaign_recipient_count();

-- Trigger for form submission counts
CREATE OR REPLACE FUNCTION public.increment_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.forms
    SET submission_count = submission_count + 1
    WHERE id = NEW.form_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS form_submission_trigger ON public.form_submissions;
CREATE TRIGGER form_submission_trigger
AFTER INSERT ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.increment_form_submission_count();
