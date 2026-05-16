-- Sprint 4-7: Advanced Invoicing, Quotes, Retainers, and Portals

-- SPRINT 4: QUOTES
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    contact_id UUID REFERENCES contacts(id),
    quote_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, declined, expired, converted
    items JSONB DEFAULT '[]'::jsonb,
    subtotal NUMERIC(12,2) DEFAULT 0.00,
    tax_total NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    shipping_charges NUMERIC(12,2) DEFAULT 0.00,
    adjustment NUMERIC(12,2) DEFAULT 0.00,
    terms_and_conditions TEXT,
    portal_token UUID DEFAULT gen_random_uuid(),
    converted_invoice_id UUID REFERENCES invoices(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- SPRINT 5: RETAINERS & PAYMENT PLANS
DO $$ BEGIN
    CREATE TYPE retainer_entry_type AS ENUM ('credit_advance', 'debit_invoice_apply');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS retainers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    contact_id UUID REFERENCES contacts(id),
    amount_remaining NUMERIC(12,2) DEFAULT 0.00,
    total_amount NUMERIC(12,2) DEFAULT 0.00,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS retainer_ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    contact_id UUID REFERENCES contacts(id),
    amount NUMERIC(12,2) NOT NULL,
    entry_type retainer_entry_type NOT NULL,
    invoice_id UUID REFERENCES invoices(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoice_payment_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    total_instalments INTEGER NOT NULL DEFAULT 1,
    interval_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
    CREATE TYPE instalment_status AS ENUM ('unpaid', 'paid');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS invoice_payment_instalments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES invoice_payment_plans(id) ON DELETE CASCADE,
    instalment_number INTEGER NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL,
    due_date DATE NOT NULL,
    status instalment_status DEFAULT 'unpaid',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SPRINT 6: TIME & EXPENSE
CREATE TABLE IF NOT EXISTS time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    contact_id UUID REFERENCES contacts(id),
    project_id UUID, -- Optional project link
    task_id UUID, -- Optional task link
    duration_seconds INTEGER DEFAULT 0,
    billable_rate NUMERIC(12,2) DEFAULT 0.00,
    status TEXT DEFAULT 'unbilled', -- unbilled, billed
    invoice_id UUID REFERENCES invoices(id),
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    contact_id UUID REFERENCES contacts(id),
    category TEXT,
    amount NUMERIC(12,2) DEFAULT 0.00,
    currency TEXT DEFAULT 'USD',
    receipt_url TEXT,
    status TEXT DEFAULT 'unbilled', -- unbilled, billed
    invoice_id UUID REFERENCES invoices(id),
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS price_list_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_list_id UUID REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id UUID, -- Reference to products table
    custom_price NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- SPRINT 7: PORTAL ACCOUNTS
CREATE TABLE IF NOT EXISTS portal_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retainer_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payment_instalments ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_accounts ENABLE ROW LEVEL SECURITY;

-- Standard Workspace RLS Policies (Simplified for brevity)
CREATE POLICY "Workspace access for quotes" ON quotes FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace access for retainers" ON retainers FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace access for retainer_ledger" ON retainer_ledger_entries FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace access for time_entries" ON time_entries FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace access for expenses" ON expenses FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace access for price_lists" ON price_lists FOR ALL USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
CREATE POLICY "Workspace access for price_list_items" ON price_list_items FOR ALL USING (price_list_id IN (SELECT id FROM price_lists WHERE workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())));
