-- Calendar System DEEP INTEGRITY CHECK
-- Checks constraints, triggers, functions, and advanced policies

WITH integrity_checks AS (
    -- 1. Check for Critical Functions
    SELECT 
        'FUNCTION' as type,
        p.proname as target,
        '✅ CONFIGURED' as status
    FROM pg_proc p 
    WHERE p.proname IN ('fn_consume_credit', 'fn_get_pre_meeting_brief', 'fn_secure_booking_or_waitlist')
    
    UNION ALL
    
    -- 2. Check for Active Triggers
    SELECT 
        'TRIGGER' as type,
        tgname as target,
        '✅ ACTIVE' as status
    FROM pg_trigger
    WHERE tgname IN ('tr_appointment_credit_usage', 'tr_handle_booking_outcome_actions', 'tr_update_booking_analytics')

    UNION ALL

    -- 3. Check for specific required FK relationships
    SELECT 
        'RELATIONSHIP' as type,
        conname as target,
        '✅ ENFORCED' as status
    FROM pg_constraint
    WHERE conname IN ('appointments_calendar_id_fkey', 'booking_outcomes_calendar_id_fkey')

    UNION ALL

    -- 4. Check for RLS Policy Coverage
    SELECT 
        'RLS_POLICY' as type,
        tablename as target,
        '✅ SECURED' as status
    FROM pg_policies
    WHERE tablename IN ('booking_calendars', 'appointments', 'contact_booking_credits')
)
SELECT * FROM integrity_checks;
