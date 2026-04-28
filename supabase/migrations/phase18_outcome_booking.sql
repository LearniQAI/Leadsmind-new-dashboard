-- Phase 18: Outcome-Based Booking System

-- 1. Booking Outcomes
CREATE TABLE IF NOT EXISTS booking_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    calendar_id UUID NOT NULL REFERENCES booking_calendars(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER DEFAULT 30,
    assigned_user_ids UUID[] DEFAULT '{}',
    pre_meeting_email_template_id UUID, -- Optional: reference to email template
    post_meeting_workflow_id UUID REFERENCES workflows(id) ON DELETE SET NULL,
    pipeline_stage_id UUID REFERENCES pipeline_stages(id) ON DELETE SET NULL,
    color TEXT DEFAULT '#6c47ff',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Update Appointments to link to Outcome
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'outcome_id') THEN
        ALTER TABLE appointments ADD COLUMN outcome_id UUID REFERENCES booking_outcomes(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. RLS Policies
ALTER TABLE booking_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for outcomes" ON booking_outcomes
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_outcomes_calendar ON booking_outcomes(calendar_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_workspace ON booking_outcomes(workspace_id);

-- 5. Automations & Triggers

-- Trigger to handle pipeline movement and workflow enrollment on booking with outcome
CREATE OR REPLACE FUNCTION fn_handle_booking_outcome_actions()
RETURNS TRIGGER AS $$
DECLARE
    v_outcome RECORD;
    v_opportunity_id UUID;
BEGIN
    IF (NEW.outcome_id IS NOT NULL) THEN
        -- Fetch outcome details
        SELECT * INTO v_outcome FROM booking_outcomes WHERE id = NEW.outcome_id;

        IF FOUND THEN
            -- 1. Create/Move Pipeline Opportunity
            IF (v_outcome.pipeline_stage_id IS NOT NULL) THEN
                -- Check if opportunity already exists for this contact in this workspace
                SELECT id INTO v_opportunity_id 
                FROM opportunities 
                WHERE contact_id = NEW.contact_id 
                  AND workspace_id = NEW.workspace_id 
                LIMIT 1;

                IF (v_opportunity_id IS NOT NULL) THEN
                    -- Move existing
                    UPDATE opportunities 
                    SET stage_id = v_outcome.pipeline_stage_id,
                        updated_at = now()
                    WHERE id = v_opportunity_id;
                ELSE
                    -- Create new
                    INSERT INTO opportunities (workspace_id, contact_id, stage_id, title, status)
                    VALUES (NEW.workspace_id, NEW.contact_id, v_outcome.pipeline_stage_id, NEW.title, 'open')
                    RETURNING id INTO v_opportunity_id;
                END IF;

                -- Link deal_id to appointment
                UPDATE appointments SET deal_id = v_opportunity_id WHERE id = NEW.id;
            END IF;

            -- 2. Enroll in Post-Meeting Workflow
            IF (v_outcome.post_meeting_workflow_id IS NOT NULL) THEN
                -- Enroll execution
                INSERT INTO workflow_executions (workflow_id, contact_id, workspace_id, status)
                VALUES (v_outcome.post_meeting_workflow_id, NEW.contact_id, NEW.workspace_id, 'running');
            END IF;
            
            -- 3. Note: Pre-meeting email template handling would typically happen in the app layer 
            -- or via another trigger/automation worker that watches this table.
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_handle_booking_outcome ON appointments;
CREATE TRIGGER tr_handle_booking_outcome
AFTER INSERT ON appointments
FOR EACH ROW EXECUTE FUNCTION fn_handle_booking_outcome_actions();
