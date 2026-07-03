-- Sprint 2: POPIA Compliance and List Hygiene Migrations

-- 1. Extend contacts table (Marketing / automations contacts)
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS consent_ip TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS consent_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS processing_purpose_scope TEXT;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS is_invalid_email BOOLEAN DEFAULT false;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS soft_bounce_count INTEGER DEFAULT 0;
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS consecutive_soft_bounces INTEGER DEFAULT 0;

-- 2. Extend crm_contacts table (Sales CRM contacts)
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS consent_timestamp TIMESTAMPTZ;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS consent_ip TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS consent_form_id UUID REFERENCES public.forms(id) ON DELETE SET NULL;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS processing_purpose_scope TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS is_invalid_email BOOLEAN DEFAULT false;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS soft_bounce_count INTEGER DEFAULT 0;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS consecutive_soft_bounces INTEGER DEFAULT 0;

-- 3. Create global suppression block list
CREATE TABLE IF NOT EXISTS public.global_suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    reason TEXT DEFAULT 'right_to_erasure',
    suppressed_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(workspace_id, email)
);

-- Enable Row Level Security
ALTER TABLE public.global_suppression_list ENABLE ROW LEVEL SECURITY;

-- Workspace Isolation Policy
DROP POLICY IF EXISTS "Workspace Suppression List Access" ON public.global_suppression_list;
CREATE POLICY "Workspace Suppression List Access" ON public.global_suppression_list
    FOR ALL USING (workspace_id IN (
        SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    ));
