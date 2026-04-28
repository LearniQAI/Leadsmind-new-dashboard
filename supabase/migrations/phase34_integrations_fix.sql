-- Phase 34 Fix: Universal Integration & Intelligence Bridge (Defensive Fix)

-- 1. Create activity_type ENUM if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_type') THEN
        CREATE TYPE activity_type AS ENUM (
            'email_sent', 'email_received', 'call', 'meeting', 'note', 'task',
            'quiz_passed', 'quiz_failed', 'certificate_issued', 'booking_scheduled', 'booking_noshow'
        );
    ELSE
        -- If it exists, add the new values safely
        BEGIN ALTER TYPE activity_type ADD VALUE 'quiz_passed'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE activity_type ADD VALUE 'quiz_failed'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE activity_type ADD VALUE 'certificate_issued'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE activity_type ADD VALUE 'booking_scheduled'; EXCEPTION WHEN duplicate_object THEN null; END;
        BEGIN ALTER TYPE activity_type ADD VALUE 'booking_noshow'; EXCEPTION WHEN duplicate_object THEN null; END;
    END IF;
END $$;

-- 2. CRM Contact Enhancements
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS quiz_mastery_level TEXT,
ADD COLUMN IF NOT EXISTS total_booking_credits INTEGER DEFAULT 0;

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
    IF NEW.status = 'no_show' AND OLD.status != 'no_show' THEN
        UPDATE contacts SET no_show_count = no_show_count + 1 WHERE id = NEW.contact_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
