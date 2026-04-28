-- PHASE 17: AI ACCOUNTANT INTELLIGENCE LAYER - SET 1: INTELLIGENT ONBOARDING
-- Foundation for conversational intake, compliance settings, and chart of accounts

-- 1. ACCOUNTANT ONBOARDING STATE
CREATE TABLE IF NOT EXISTS public.accountant_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    current_step INTEGER DEFAULT 1, -- Tracks progress through the 17 screens
    is_completed BOOLEAN DEFAULT false,
    
    -- Core Profile Data
    business_structure TEXT, -- 'sole_prop', 'pty_ltd', 'partnership', 'npo', 'trust'
    tax_scope TEXT, -- 'vat_only', 'full_books', 'basic_tracking'
    industry TEXT, -- 'services', 'retail', 'law', 'construction', 'healthcare', etc.
    has_business_bank_account BOOLEAN DEFAULT false,
    
    -- South African Compliance (SARS specific)
    sars_registered BOOLEAN DEFAULT false,
    vat_registered BOOLEAN DEFAULT false,
    tax_number TEXT,
    vat_number TEXT,
    fiscal_year_start DATE DEFAULT (CURRENT_DATE - interval '1 year'),
    
    -- Catch-all for extra conversational metadata
    onboarding_data JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CHART OF ACCOUNTS (CoA)
-- Foundation for the categorical intelligence layer
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    code TEXT NOT NULL, -- Account code (e.g., 1000 for Petty Cash)
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
    category TEXT, -- 'current_asset', 'fixed_asset', 'operating_expense', etc.
    parent_id UUID REFERENCES public.chart_of_accounts(id) ON DELETE SET NULL,
    is_system BOOLEAN DEFAULT false, -- True for templates provided by LeadsMind
    tax_category TEXT, -- Mapping to SARS tax forms/categories
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(workspace_id, code)
);

-- 3. INDUSTRY TEMPLATES SEED (Hypothetical for now, managed via logic)
-- This table would store the master templates that the AI copies into a new workspace
CREATE TABLE IF NOT EXISTS public.coa_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    industry TEXT NOT NULL,
    business_structure TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    tax_category TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. SECURITY (RLS)
ALTER TABLE public.accountant_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coa_templates ENABLE ROW LEVEL SECURITY;

-- Policies for Onboarding
CREATE POLICY "Users can manage their workspace onboarding"
    ON public.accountant_onboarding
    FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()))
    WITH CHECK (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Policies for Chart of Accounts
CREATE POLICY "Users can manage their workspace CoA"
    ON public.chart_of_accounts
    FOR ALL
    TO authenticated
    USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- Templates are view-only for authenticated users
CREATE POLICY "Users can view CoA templates"
    ON public.coa_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. FUNCTIONS & TRIGGERS
CREATE TRIGGER update_accountant_onboarding_updated_at 
    BEFORE UPDATE ON accountant_onboarding 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chart_of_accounts_updated_at 
    BEFORE UPDATE ON chart_of_accounts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. INDEXES
CREATE INDEX idx_accountant_onboarding_workspace ON accountant_onboarding(workspace_id);
CREATE INDEX idx_coa_workspace ON chart_of_accounts(workspace_id);
CREATE INDEX idx_coa_template_industry ON coa_templates(industry);
