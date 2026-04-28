-- Master Calendar RLS & Table Sweep
-- Ensures all tables exist, have RLS, and correct policies

-- 1. Ensure RLS is enabled for all calendar tables
ALTER TABLE IF EXISTS booking_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contact_booking_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_intake_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS booking_slot_analytics ENABLE ROW LEVEL SECURITY;

-- 2. Drop and Recreate Policies to ensure consistency
-- (Using check_workspace_access which is the standard in this CRM)

DO $$ 
BEGIN
    -- booking_calendars
    DROP POLICY IF EXISTS "Calendar access" ON booking_calendars;
    CREATE POLICY "Calendar access" ON booking_calendars FOR ALL USING (check_workspace_access(workspace_id));

    -- appointments
    DROP POLICY IF EXISTS "Appointment access" ON appointments;
    CREATE POLICY "Appointment access" ON appointments FOR ALL USING (check_workspace_access(workspace_id));

    -- booking_outcomes
    DROP POLICY IF EXISTS "Outcome access" ON booking_outcomes;
    CREATE POLICY "Outcome access" ON booking_outcomes FOR ALL USING (check_workspace_access(workspace_id));

    -- booking_packages
    DROP POLICY IF EXISTS "Package access" ON booking_packages;
    CREATE POLICY "Package access" ON booking_packages FOR ALL USING (check_workspace_access(workspace_id));

    -- contact_booking_credits
    DROP POLICY IF EXISTS "Credit balance access" ON contact_booking_credits;
    CREATE POLICY "Credit balance access" ON contact_booking_credits FOR ALL USING (check_workspace_access(workspace_id));

    -- credit_ledger
    DROP POLICY IF EXISTS "Ledger access" ON credit_ledger;
    CREATE POLICY "Ledger access" ON credit_ledger FOR ALL USING (check_workspace_access(workspace_id));

    -- booking_intake_forms
    DROP POLICY IF EXISTS "Intake form access" ON booking_intake_forms;
    CREATE POLICY "Intake form access" ON booking_intake_forms FOR ALL USING (check_workspace_access(workspace_id));

    -- booking_intake_responses
    DROP POLICY IF EXISTS "Intake response access" ON booking_intake_responses;
    CREATE POLICY "Intake response access" ON booking_intake_responses FOR ALL USING (check_workspace_access(workspace_id));

    -- booking_slot_analytics
    DROP POLICY IF EXISTS "Analytics access" ON booking_slot_analytics;
    CREATE POLICY "Analytics access" ON booking_slot_analytics FOR ALL USING (check_workspace_access(workspace_id));
END $$;

-- 3. Ensure Missing Columns (Master Sweep)
-- This ensures that even if a migration was interrupted, columns are present
DO $$
BEGIN
    -- booking_packages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_packages' AND column_name='normal_price') THEN
        ALTER TABLE booking_packages ADD COLUMN normal_price DECIMAL(10,2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_packages' AND column_name='stripe_price_id') THEN
        ALTER TABLE booking_packages ADD COLUMN stripe_price_id TEXT;
    END IF;

    -- contact_booking_credits
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='contact_booking_credits' AND column_name='credits_remaining') THEN
        ALTER TABLE contact_booking_credits ADD COLUMN credits_remaining INTEGER GENERATED ALWAYS AS (credits_total - credits_used) STORED;
    END IF;
END $$;
