-- Phase 21: Intake Form Builder & Pre-Meeting Brief

-- 1. Booking Intake Forms
CREATE TABLE IF NOT EXISTS booking_intake_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    calendar_id UUID NOT NULL REFERENCES booking_calendars(id) ON DELETE CASCADE,
    fields JSONB DEFAULT '[]', -- Array of { id, type, label, options, required, logic: { showIf: { fieldId, value } } }
    send_hours_before INTEGER DEFAULT 24,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(calendar_id)
);

-- 2. Booking Intake Responses
CREATE TABLE IF NOT EXISTS booking_intake_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    responses JSONB DEFAULT '{}', -- Key-value map of { fieldId: answer }
    submitted_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(appointment_id)
);

-- 3. RLS Policies
ALTER TABLE booking_intake_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_intake_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace access for intake forms" ON booking_intake_forms
    FOR ALL USING (check_workspace_access(workspace_id));

CREATE POLICY "Workspace access for intake responses" ON booking_intake_responses
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. Briefing Functionality (Data Aggregation View)
-- This could be a view or a function that assembles the JSON for the brief
CREATE OR REPLACE FUNCTION fn_get_pre_meeting_brief(p_appointment_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_apt RECORD;
    v_contact RECORD;
    v_responses JSONB;
    v_activities JSONB;
    v_deals JSONB;
BEGIN
    -- 1. Fetch appointment and contact
    SELECT a.*, c.first_name, c.last_name, c.email, c.phone, c.lead_score, c.lead_score_explanation 
    INTO v_apt
    FROM appointments a
    JOIN contacts c ON a.contact_id = c.id
    WHERE a.id = p_appointment_id;

    IF NOT FOUND THEN RETURN NULL; END IF;

    -- 2. Fetch Intake Responses
    SELECT responses INTO v_responses FROM booking_intake_responses WHERE appointment_id = p_appointment_id;

    -- 3. Fetch Last 3 Activity Entries (Mock query using existing activity pattern)
    -- In this CRM, activity is usually in a 'contact_activities' or 'notes' table
    SELECT jsonb_agg(sub) INTO v_activities FROM (
        SELECT type, content, created_at 
        FROM contact_activity 
        WHERE contact_id = v_apt.contact_id 
        ORDER BY created_at DESC 
        LIMIT 3
    ) sub;

    -- 4. Fetch Open Deals
    SELECT jsonb_agg(sub) INTO v_deals FROM (
        SELECT title, status, value 
        FROM opportunities 
        WHERE contact_id = v_apt.contact_id AND status = 'open'
    ) sub;

    RETURN jsonb_build_object(
        'contact', jsonb_build_object(
            'id', v_apt.contact_id,
            'name', v_apt.first_name || ' ' || v_apt.last_name,
            'email', v_apt.email,
            'phone', v_apt.phone,
            'lead_score', v_apt.lead_score
        ),
        'meeting_title', v_apt.title,
        'meeting_start', v_apt.start_time,
        'intake_answers', v_responses,
        'recent_activity', v_activities,
        'open_deals', v_deals
    );
END;
$$ LANGUAGE plpgsql;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_intake_forms_calendar ON booking_intake_forms(calendar_id);
CREATE INDEX IF NOT EXISTS idx_intake_responses_apt ON booking_intake_responses(appointment_id);
