-- PHASE 16: INVOICING MODULE - SPRINT 1 (CRM EDITION)
-- Core infrastructure for invoices, quotes, and CRM integration

-- 1. EXTEND CRM ACTIVITIES
ALTER TABLE public.contact_activities DROP CONSTRAINT IF EXISTS contact_activities_type_check;
ALTER TABLE public.contact_activities ADD CONSTRAINT contact_activities_type_check 
CHECK (type IN ('note', 'task', 'deal', 'system', 'invoice', 'quote'));

-- 2. INVOICE SETTINGS (Workspace Level)
CREATE TABLE IF NOT EXISTS public.invoice_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    invoice_prefix TEXT DEFAULT 'INV-',
    next_invoice_number INTEGER DEFAULT 1,
    quote_prefix TEXT DEFAULT 'QT-',
    next_quote_number INTEGER DEFAULT 1,
    default_terms TEXT,
    default_notes TEXT,
    vat_number TEXT,
    company_address TEXT,
    company_email TEXT,
    company_phone TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENHANCE INVOICES TABLE
-- We add columns to the table created in Phase 6
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tax_total DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS discount_total DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS terms TEXT;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id);

-- 4. QUOTES TABLE
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    quote_number TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'sent', 'accepted', 'declined', 'expired'
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    tax_total DECIMAL(10, 2) DEFAULT 0.00,
    discount_total DECIMAL(10, 2) DEFAULT 0.00,
    shipping_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    notes TEXT,
    terms TEXT,
    expiry_date TIMESTAMPTZ,
    assigned_to UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LINE ITEMS (For both Invoices and Quotes)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    tax_rate DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT item_parent_check CHECK (
        (invoice_id IS NOT NULL AND quote_id IS NULL) OR 
        (invoice_id IS NULL AND quote_id IS NOT NULL)
    )
);

-- 6. CUSTOM FIELDS (Industry specific)
CREATE TABLE IF NOT EXISTS public.invoice_custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL, -- 'invoice', 'quote'
    label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text', -- 'text', 'number', 'date', 'dropdown', 'checkbox', 'url'
    options JSONB, -- For dropdowns
    is_required BOOLEAN DEFAULT false,
    show_on_pdf BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Custom fields values
CREATE TABLE IF NOT EXISTS public.invoice_custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id UUID NOT NULL REFERENCES public.invoice_custom_fields(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    value TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT value_parent_check CHECK (
        (invoice_id IS NOT NULL AND quote_id IS NULL) OR 
        (invoice_id IS NULL AND quote_id IS NOT NULL)
    )
);

-- 7. ATTACHMENTS
CREATE TABLE IF NOT EXISTS public.invoice_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES public.media_files(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT attachment_parent_check CHECK (
        (invoice_id IS NOT NULL AND quote_id IS NULL) OR 
        (invoice_id IS NULL AND quote_id IS NOT NULL)
    )
);

-- 8. SECURITY (RLS)
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_attachments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Workspace access for invoice settings" ON public.invoice_settings
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for quotes" ON public.quotes
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for invoice items" ON public.invoice_items
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for invoice custom fields" ON public.invoice_custom_fields
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for invoice custom field values" ON public.invoice_custom_field_values
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for invoice attachments" ON public.invoice_attachments
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 9. TRIGGERS
CREATE TRIGGER update_invoice_settings_updated_at BEFORE UPDATE ON invoice_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. INDEXES
CREATE INDEX idx_invoice_settings_workspace ON invoice_settings(workspace_id);
CREATE INDEX idx_quotes_contact ON quotes(contact_id);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_quote ON invoice_items(quote_id);
