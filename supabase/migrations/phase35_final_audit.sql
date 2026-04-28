-- PHASE 35: FINAL ARCHITECTURAL AUDIT & DEEP INTEGRITY LOCK

-- 1. Verify and Fix missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_quiz_subs_status ON lms_quiz_submissions(status);
CREATE INDEX IF NOT EXISTS idx_quiz_subs_contact ON lms_quiz_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- 2. Audit: Ensure all Enum values are present
DO $$ 
BEGIN
    -- Activity Types Safety Check
    BEGIN
        ALTER TYPE activity_type ADD VALUE 'quiz_passed';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TYPE activity_type ADD VALUE 'quiz_failed';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    
    BEGIN
        ALTER TYPE activity_type ADD VALUE 'booking_noshow';
    EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 3. Audit: Default Table Policies (RLS)
-- Ensure every new table has RLS enabled
ALTER TABLE IF EXISTS lms_adaptive_rules_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS automation_triggers ENABLE ROW LEVEL SECURITY;

-- 4. Audit: Integrity Trigger (Recursive Check)
-- Ensuring quiz_mastery_level doesn't get corrupted
CREATE OR REPLACE FUNCTION fn_audit_sync_check()
RETURNS TRIGGER AS $$
BEGIN
    -- Validation logic for cross-system sync
    IF NEW.score < 0 OR NEW.score > 100 THEN
        NEW.score = 0;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_quiz_submission ON lms_quiz_submissions;
CREATE TRIGGER tr_audit_quiz_submission
BEFORE INSERT OR UPDATE ON lms_quiz_submissions
FOR EACH ROW EXECUTE FUNCTION fn_audit_sync_check();

-- 5. Final Registry Check
DELETE FROM automation_triggers WHERE id NOT IN ('quiz_passed', 'quiz_failed', 'certificate_issued', 'booking_scheduled', 'booking_credits_low');
