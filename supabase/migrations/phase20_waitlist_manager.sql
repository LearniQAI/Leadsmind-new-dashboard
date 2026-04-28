-- Phase 20: Multi-Host Group Sessions & Real-Time Waitlist

-- 1. Updates to Appointments
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS max_attendees INTEGER DEFAULT 1;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS current_attendee_count INTEGER DEFAULT 0;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS waitlist_enabled BOOLEAN DEFAULT false;

-- 2. Booking Waitlists
CREATE TABLE IF NOT EXISTS booking_waitlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    offered_at TIMESTAMPTZ,
    offer_expires_at TIMESTAMPTZ,
    confirmed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(appointment_id, contact_id)
);

-- 3. RLS Policies
ALTER TABLE booking_waitlists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace access for waitlists" ON booking_waitlists
    FOR ALL USING (check_workspace_access(workspace_id));

-- 4. Atomic Booking Logic (Function)
-- This handles the "first commit wins" and automatic waitlist overflow
CREATE OR REPLACE FUNCTION fn_secure_booking_or_waitlist(
    p_workspace_id UUID,
    p_appointment_id UUID,
    p_contact_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_apt RECORD;
    v_waitlist_pos INTEGER;
    v_result JSONB;
BEGIN
    -- 1. Lock the appointment row for update to prevent concurrent overbooking
    SELECT * INTO v_apt 
    FROM appointments 
    WHERE id = p_appointment_id 
      AND workspace_id = p_workspace_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;

    -- 2. Check if there are spots available
    IF (v_apt.current_attendee_count < v_apt.max_attendees) THEN
        -- Book the spot
        UPDATE appointments 
        SET current_attendee_count = current_attendee_count + 1,
            updated_at = now()
        WHERE id = p_appointment_id;

        -- Create attendee record (if we had an attendees table, for now we assume linking exists via contact/apt)
        -- For simplicity in this demo, we'll return a success status
        RETURN jsonb_build_object('success', true, 'mode', 'booked', 'appointment', v_apt);
    ELSE
        -- ALL SPOTS FULL -> Handle Waitlist
        IF (v_apt.waitlist_enabled) THEN
            -- Get next position
            SELECT COALESCE(MAX(position), 0) + 1 INTO v_waitlist_pos 
            FROM booking_waitlists 
            WHERE appointment_id = p_appointment_id;

            INSERT INTO booking_waitlists (workspace_id, appointment_id, contact_id, position)
            VALUES (p_workspace_id, p_appointment_id, p_contact_id, v_waitlist_pos);

            RETURN jsonb_build_object('success', true, 'mode', 'waitlist', 'position', v_waitlist_pos);
        ELSE
            RETURN jsonb_build_object('success', false, 'error', 'Session is full and waitlist is disabled');
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Cancellation & Waitlist Promotion Logic
CREATE OR REPLACE FUNCTION fn_handle_cancellation_promotion()
RETURNS TRIGGER AS $$
DECLARE
    v_first_waitlist_id UUID;
BEGIN
    -- If a spot opens up (current_attendee_count decreases)
    IF (OLD.current_attendee_count > NEW.current_attendee_count) THEN
        -- Find the first person on the waitlist who hasn't been offered yet or has expired
        SELECT id INTO v_first_waitlist_id 
        FROM booking_waitlists 
        WHERE appointment_id = NEW.id 
          AND confirmed = false 
          AND (offered_at IS NULL OR offer_expires_at < now())
        ORDER BY position ASC 
        LIMIT 1;

        IF (v_first_waitlist_id IS NOT NULL) THEN
            UPDATE booking_waitlists 
            SET offered_at = now(),
                offer_expires_at = now() + interval '2 hours'
            WHERE id = v_first_waitlist_id;
            
            -- Trigger for actual SMS/Email would happen here or via external service
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cancel_promotion ON appointments;
CREATE TRIGGER tr_cancel_promotion
AFTER UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION fn_handle_cancellation_promotion();

-- 6. Indexes
CREATE INDEX IF NOT EXISTS idx_waitlists_appointment ON booking_waitlists(appointment_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_position ON booking_waitlists(appointment_id, position);
