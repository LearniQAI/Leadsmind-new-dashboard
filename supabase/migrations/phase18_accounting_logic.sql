-- PHASE 18: AI ACCOUNTANT - SET 2: COMPLIANCE & CORE ACCOUNTING LOGIC (SA SPECIFIC)

-- 1. ACCOUNTING CORE: TRANSACTIONS & JOURNAL ENTRIES
CREATE TABLE IF NOT EXISTS public.accounting_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference TEXT,
    source_type TEXT NOT NULL DEFAULT 'manual', -- 'invoice', 'quote', 'expense', 'manual', 'bank_feed'
    source_id UUID, -- Links to invoice_id, quote_id, etc.
    total_amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.accounting_transactions(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
    debit DECIMAL(15, 2) DEFAULT 0.00,
    credit DECIMAL(15, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. PROVISIONAL TAX (IRP6)
CREATE TABLE IF NOT EXISTS public.provisional_tax_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    period_year INTEGER NOT NULL, -- e.g., 2024
    period_type TEXT NOT NULL, -- 'P1' (August), 'P2' (February), 'P3' (Top-up)
    estimated_taxable_income DECIMAL(15, 2) DEFAULT 0.00,
    estimated_tax_liability DECIMAL(15, 2) DEFAULT 0.00,
    actual_paid DECIMAL(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending', -- 'draft', 'submitted', 'paid'
    submission_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. DIRECTOR'S LOANS & OWNER DRAWINGS
CREATE TABLE IF NOT EXISTS public.director_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    director_name TEXT NOT NULL,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    interest_rate DECIMAL(5, 2) DEFAULT 0.00, -- SARS Official Rate
    is_overdrawn BOOLEAN DEFAULT false,
    last_interest_calc_at DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. HOME OFFICE & CONTRACTORS
CREATE TABLE IF NOT EXISTS public.home_office_setup (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE UNIQUE,
    total_home_area DECIMAL(10, 2), -- sq meters
    dedicated_office_area DECIMAL(10, 2), -- sq meters
    deduction_percentage DECIMAL(5, 2), -- (office / total) * 100
    expense_categories JSONB DEFAULT '["rent", "electricity", "repairs", "internet"]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
    tax_number TEXT,
    it3a_required BOOLEAN DEFAULT true,
    total_paid_current_year DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. LOANS & DEBT TRACKING
CREATE TABLE IF NOT EXISTS public.business_loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lender_name TEXT NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    current_balance DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 2) NOT NULL,
    repayment_schedule TEXT, -- 'monthly', 'quarterly', 'bullet'
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. SECURITY (RLS)
ALTER TABLE public.accounting_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisional_tax_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.director_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_office_setup ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_loans ENABLE ROW LEVEL SECURITY;

-- Policies (Generic Workspace Isolation)
CREATE POLICY "Workspace access for accounting_transactions" ON public.accounting_transactions
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for journal_entries" ON public.journal_entries
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for provisional_tax" ON public.provisional_tax_records
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for director_loans" ON public.director_loans
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for home_office_setup" ON public.home_office_setup
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for contractors" ON public.contractors
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Workspace access for business_loans" ON public.business_loans
    FOR ALL USING (workspace_id IN (SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()));

-- 7. TRIGGERS
CREATE TRIGGER update_accounting_transactions_updated_at BEFORE UPDATE ON accounting_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provisional_tax_records_updated_at BEFORE UPDATE ON provisional_tax_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_director_loans_updated_at BEFORE UPDATE ON director_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_business_loans_updated_at BEFORE UPDATE ON business_loans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. INDEXES
CREATE INDEX idx_transactions_workspace ON accounting_transactions(workspace_id);
CREATE INDEX idx_journal_transaction ON journal_entries(transaction_id);
CREATE INDEX idx_journal_account ON journal_entries(account_id);
CREATE INDEX idx_provisional_workspace ON provisional_tax_records(workspace_id);
CREATE INDEX idx_contractors_contact ON contractors(contact_id);
