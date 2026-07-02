-- Phase 22: Session Packages & Credit System

-- 1. Booking Packages
CREATE TABLE IF NOT EXISTS booking_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    total_credits INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Contact Credits (Balance)
CREATE TABLE IF NOT EXISTS contact_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    calendar_id UUID REFERENCES booking_calendars(id) ON DELETE CASCADE, -- Optional: limit credits to specific calendar
    remaining_credits INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT now(),
    UNIQUE(contact_id, workspace_id, calendar_id)
);

-- 3. Credit Ledger (Audit Trail)
CREATE TABLE IF NOT EXISTS credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive for purchase, Negative for usage
    action TEXT NOT NULL CHECK (action IN ('purchase', 'usage', 'refund', 'adjustment')),
    reference_id UUID, -- Link to package_id or appointment_id
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS Policies
ALTER TABLE booking_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for packages" ON booking_packages
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for credits" ON contact_credits
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for ledger" ON credit_ledger
    FOR ALL USING (check_workspace_access(workspace_id));

-- 5. Atomic Credit Usage Logic
CREATE OR REPLACE FUNCTION fn_consume_credit(
    p_workspace_id UUID,
    p_contact_id UUID,
    p_calendar_id UUID,
    p_appointment_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_balance RECORD;
BEGIN
    -- 1. Check and lock balance
    SELECT * INTO v_balance 
    FROM contact_credits 
    WHERE contact_id = p_contact_id 
      AND workspace_id = p_workspace_id
      AND (calendar_id IS NULL OR calendar_id = p_calendar_id)
    FOR UPDATE;

    IF NOT FOUND OR v_balance.remaining_credits < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient credits');
    END IF;

    -- 2. Deduct credit
    UPDATE contact_credits 
    SET remaining_credits = remaining_credits - 1,
        last_updated = now()
    WHERE id = v_balance.id;

    -- 3. Log to ledger
    INSERT INTO credit_ledger (workspace_id, contact_id, amount, action, reference_id)
    VALUES (p_workspace_id, p_contact_id, -1, 'usage', p_appointment_id);

    RETURN jsonb_build_object('success', true, 'remaining', v_balance.remaining_credits - 1);
END;
$$ LANGUAGE plpgsql;

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_credits_contact ON contact_credits(contact_id);
CREATE INDEX IF NOT EXISTS idx_ledger_contact ON credit_ledger(contact_id);
