-- Stripe Customers for Contacts
CREATE TABLE IF NOT EXISTS public.stripe_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  stripe_customer_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Workspace Branding
CREATE TABLE IF NOT EXISTS public.workspace_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#5C4AC7', -- Platform primary
  custom_domain TEXT UNIQUE,
  platform_name TEXT DEFAULT 'LeadsMind',
  support_email TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Stripe Customers
ALTER TABLE public.stripe_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces can view their stripe customers"
ON public.stripe_customers FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- RLS for Branding
ALTER TABLE public.workspace_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspaces can view their branding"
ON public.workspace_branding FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspaces can update their branding"
ON public.workspace_branding FOR UPDATE
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspaces can insert their branding"
ON public.workspace_branding FOR INSERT
TO authenticated
WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

-- Clients can see branding for their workspace
CREATE POLICY "Clients can view branding"
ON public.workspace_branding FOR SELECT
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM contacts WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())));
