-- Phase 23: Refined Session Packages & Booking Credits (Feature 8)

-- 1. Booking Packages
CREATE TABLE IF NOT EXISTS booking_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    calendar_id UUID NOT NULL REFERENCES booking_calendars(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    session_count INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    normal_price DECIMAL(10,2),
    stripe_price_id TEXT,
    expires_days INTEGER DEFAULT 365,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Contact Booking Credits
CREATE TABLE IF NOT EXISTS contact_booking_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    calendar_id UUID REFERENCES booking_calendars(id) ON DELETE CASCADE,
    package_id UUID REFERENCES booking_packages(id) ON DELETE SET NULL,
    credits_total INTEGER NOT NULL,
    credits_used INTEGER DEFAULT 0,
    purchased_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    -- Computed field for remaining credits
    credits_remaining INTEGER GENERATED ALWAYS AS (credits_total - credits_used) STORED,
    workspace_id UUID NOT NULL
);

-- 3. RLS Policies
ALTER TABLE booking_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_booking_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Package Workspace Access" ON booking_packages
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE POLICY "Credit Workspace Access" ON contact_booking_credits
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. Credit Usage Trigger logic
CREATE OR REPLACE FUNCTION fn_track_credit_usage()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if status changes to 'scheduled' or 'showed_up' from an unpaid state
    -- In a real system, we'd check if this appointment used a credit or paid cash
    IF NEW.status IN ('scheduled', 'showed_up') AND OLD.status NOT IN ('scheduled', 'showed_up') THEN
        UPDATE contact_booking_credits 
        SET credits_used = credits_used + 1
        WHERE contact_id = NEW.contact_id 
          AND calendar_id = NEW.calendar_id
          AND credits_remaining > 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_appointment_credit_usage
    AFTER UPDATE OF status ON appointments
    FOR EACH ROW
    WHEN (NEW.status != OLD.status)
    EXECUTE FUNCTION fn_track_credit_usage();

-- 5. Revenue Report View Helper
CREATE OR REPLACE VIEW view_booking_revenue_analysis AS
SELECT 
    workspace_id,
    SUM(CASE WHEN action = 'purchase' THEN (SELECT price FROM booking_packages WHERE id = reference_id) ELSE 0 END) as total_package_revenue,
    COUNT(DISTINCT contact_id) as unique_paying_customers
FROM credit_ledger
GROUP BY workspace_id;
