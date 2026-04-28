-- Phase 34: Universal Integration & Intelligence Bridge

-- 1. CRM Contact Enhancements
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_mastery_level TEXT,
ADD COLUMN IF NOT EXISTS total_booking_credits INTEGER DEFAULT 0;

-- 2. Unified Activity Ledger (Add Quiz/Booking Types)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type_ext') THEN
        ALTER TYPE activity_type ADD VALUE 'quiz_passed';
        ALTER TYPE activity_type ADD VALUE 'quiz_failed';
        ALTER TYPE activity_type ADD VALUE 'certificate_issued';
        ALTER TYPE activity_type ADD VALUE 'booking_scheduled';
        ALTER TYPE activity_type ADD VALUE 'booking_noshow';
    END IF;
END $$;

-- 3. Workflow Trigger Registry Expansion
INSERT INTO automation_triggers (id, name, type, description)
VALUES 
    ('quiz_passed', 'Quiz Mastery Attained', 'lms', 'Fires when a student passes any assessment'),
    ('quiz_failed', 'Assessment Failure (Max Retakes)', 'lms', 'Fires when all retakes are exhausted'),
    ('certificate_issued', 'Academic Credential Issued', 'lms', 'Fires when a PDF certificate is generated'),
    ('booking_scheduled', 'Consultation Confirmed', 'calendar', 'Fires when a meeting is booked'),
    ('booking_credits_low', 'Session Credits Depleted', 'calendar', 'Fires when only 1 credit remains')
ON CONFLICT (id) DO NOTHING;

-- 4. Integration Logic: Auto-Mark Completion
CREATE OR REPLACE FUNCTION fn_integ_handle_booking_outcome()
RETURNS TRIGGER AS $$
BEGIN
    -- If booking is marked as no-show
    IF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
        UPDATE contacts SET no_show_count = no_show_count + 1 WHERE id = NEW.contact_id;
    END IF;
    
    -- Sync with Pipeline
    IF NEW.status = 'confirmed' THEN
        -- Logic to move pipeline stage if configured
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
