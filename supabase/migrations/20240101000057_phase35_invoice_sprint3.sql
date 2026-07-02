-- Sprint 3: SARS Compliance, Credit Notes & Debt Erasure

-- 1. Table credit_notes
CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id),
    credit_number TEXT NOT NULL UNIQUE,
    amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for credit_notes
ALTER TABLE credit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage credit notes for their workspace"
    ON credit_notes FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 2. Table invoice_write_offs
CREATE TABLE IF NOT EXISTS invoice_write_offs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id),
    amount_written_off NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    reason TEXT,
    logged_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for invoice_write_offs
ALTER TABLE invoice_write_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage write-offs for their workspace"
    ON invoice_write_offs FOR ALL
    USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- 3. Extend workspaces with VAT details for SARS compliance
ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS registered_name TEXT,
ADD COLUMN IF NOT EXISTS registered_address TEXT,
ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- 4. Extend contacts with VAT details
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS vat_number TEXT;

-- 5. Add status 'written_off' to invoice status enum if it exists, or handle via text
-- Note: If status is a text field, we just use it. If it's an enum, we need to alter it.
-- Assuming status is text in 'invoices' table as seen in previous sessions.
