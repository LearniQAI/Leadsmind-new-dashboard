-- PHASE 33: INVOICE SPRINT 1 - CORE DOCUMENT ENGINE & CUSTOM FIELDS

-- 1. Extend Invoices & Quotes
ALTER TABLE public.invoices 
    ADD COLUMN IF NOT EXISTS shipping_charges NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS adjustment NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
    ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES auth.users(id);

ALTER TABLE public.quotes 
    ADD COLUMN IF NOT EXISTS shipping_charges NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS adjustment NUMERIC(12, 2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
    ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES auth.users(id);

-- 2. Custom Fields Infrastructure
CREATE TYPE public.invoice_field_type AS ENUM ('text', 'number', 'date', 'dropdown', 'checkbox');
CREATE TYPE public.invoice_field_placement AS ENUM ('header', 'line_items', 'footer');

CREATE TABLE IF NOT EXISTS public.invoice_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_type public.invoice_field_type NOT NULL DEFAULT 'text',
    placement public.invoice_field_placement NOT NULL DEFAULT 'header',
    is_required BOOLEAN DEFAULT false,
    is_visible_on_pdf BOOLEAN DEFAULT true,
    options JSONB DEFAULT '[]'::jsonb, -- For dropdowns
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.invoice_custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES public.invoice_custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT one_target CHECK (
        (invoice_id IS NOT NULL AND quote_id IS NULL) OR
        (invoice_id IS NULL AND quote_id IS NOT NULL)
    )
);

-- 3. Security (RLS)
ALTER TABLE public.invoice_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members manage custom fields" ON public.invoice_custom_fields
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace members manage custom field values" ON public.invoice_custom_field_values
    FOR ALL USING (
        invoice_id IN (SELECT id FROM public.invoices WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid())) OR
        quote_id IN (SELECT id FROM public.quotes WHERE workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
    );
