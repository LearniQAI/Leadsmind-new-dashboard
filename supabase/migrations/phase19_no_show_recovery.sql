-- Phase 19: No-Show Recovery System

-- 1. Updates to Contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_no_show_at TIMESTAMPTZ;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS no_show_risk_flag BOOLEAN DEFAULT false;

-- 2. No-Show Recoveries table
CREATE TABLE IF NOT EXISTS no_show_recoveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    step_reached INTEGER DEFAULT 0, -- 0 to 4
    rebooked_at TIMESTAMPTZ,
    rebooked_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. RLS Policies
ALTER TABLE no_show_recoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for recoveries" ON no_show_recoveries
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. Logic & Triggers

-- Function to handle no-show reporting and sequence initiation
CREATE OR REPLACE FUNCTION fn_handle_no_show_recovery()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger when status changes to 'no_show'
    IF (OLD.status != NEW.status AND NEW.status = 'no_show') THEN
        -- 1. Update Contact stats
        UPDATE contacts 
        SET no_show_count = no_show_count + 1,
            last_no_show_at = now(),
            no_show_risk_flag = (no_show_count + 1 >= 2) -- Tag risk after 2 no-shows
        WHERE id = NEW.contact_id;

        -- 2. Start Recovery Sequence
        INSERT INTO no_show_recoveries (workspace_id, appointment_id, contact_id, step_reached)
        VALUES (NEW.workspace_id, NEW.id, NEW.contact_id, 1);
        
        -- Note: Actual SMS/Email sequencing happens via external workers or polling the step_reached state.
    END IF;

    -- Reset risk if rebooked (Logic for this usually in rebooking action)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_no_show_recovery ON appointments;
CREATE TRIGGER tr_no_show_recovery
AFTER UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION fn_handle_no_show_recovery();

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_recoveries_contact ON no_show_recoveries(contact_id);
CREATE INDEX IF NOT EXISTS idx_recoveries_workspace ON no_show_recoveries(workspace_id);
