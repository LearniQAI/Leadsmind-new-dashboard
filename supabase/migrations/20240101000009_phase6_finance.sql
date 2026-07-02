-- Stripe Connect and SaaS billing
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_connect_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS plan_tier TEXT DEFAULT 'free'; -- 'free', 'pro', 'enterprise'

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  stripe_product_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL, -- 'course', 'service', 'physical'
  price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  is_recurring BOOLEAN DEFAULT false,
  interval TEXT, -- 'month', 'year'
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT,
  amount_due DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'draft', -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  pdf_url TEXT,
  due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for Finance
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace owners can manage products"
ON public.products FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Workspace owners can view invoices"
ON public.invoices FOR ALL
TO authenticated
USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
