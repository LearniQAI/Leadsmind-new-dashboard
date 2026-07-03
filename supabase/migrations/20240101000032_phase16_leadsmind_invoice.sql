-- PHASE 16: LEADSMIND INVOICE (STANDALONE PRODUCT)

-- 1. Workspace Enhancements for Invoicing
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS workspace_type TEXT DEFAULT 'crm'; -- 'crm', 'standalone_invoice'
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS invoice_settings JSONB DEFAULT '{
    "prefix": "LMI-",
    "next_number": 1001,
    "template": "classic",
    "theme_color": "#6c47ff",
    "terms": "Please pay within 15 days of receiving this invoice.",
    "bank_details": "",
    "vat_enabled": true,
    "vat_rate": 15.0
}'::jsonb;

-- 2. Quotes Table
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    quote_number TEXT NOT NULL,
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'declined', 'expired'
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency TEXT DEFAULT 'ZAR',
    notes TEXT,
    terms TEXT,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enhance Invoices for Standalone builder
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_total DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb; -- For salesperson, attachments, etc.

-- 4. Recurring Invoices
CREATE TABLE IF NOT EXISTS public.recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    schedule TEXT NOT NULL, -- 'weekly', 'monthly', 'quarterly'
    next_generation_date TIMESTAMPTZ NOT NULL,
    last_generation_date TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    currency TEXT DEFAULT 'ZAR',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Credit Notes
CREATE TABLE IF NOT EXISTS public.credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Security (RLS)
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Workspace members manage standalone quotes" ON public.quotes;
CREATE POLICY "Workspace members manage standalone quotes" ON public.quotes FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace members manage standalone recurring" ON public.recurring_invoices;
CREATE POLICY "Workspace members manage standalone recurring" ON public.recurring_invoices FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Workspace members manage standalone credits" ON public.credit_notes;
CREATE POLICY "Workspace members manage standalone credits" ON public.credit_notes FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 7. Lead Capture Infrastructure
CREATE TABLE IF NOT EXISTS public.lead_capture (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    business_name TEXT,
    status TEXT DEFAULT 'new_signup', -- 'new_signup', 'activated', 'high_value', 'upgraded'
    revenue_mth DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger function to capture lead on standalone signup
CREATE OR REPLACE FUNCTION public.fn_capture_standalone_lead()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.workspace_type = 'standalone_invoice' THEN
        INSERT INTO public.lead_capture (source_workspace_id, email, business_name)
        VALUES (
            NEW.id, 
            (SELECT email FROM auth.users WHERE id = NEW.owner_id),
            NEW.name
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_on_workspace_signup_capture_lead ON public.workspaces;
CREATE TRIGGER tr_on_workspace_signup_capture_lead
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.fn_capture_standalone_lead();
