-- Calendar System Health Check & Troubleshooting Script
-- Run this to identify any missing schema components

WITH required_tables AS (
    SELECT unnest(ARRAY[
        'booking_calendars',
        'appointments',
        'booking_outcomes',
        'booking_packages',
        'contact_booking_credits',
        'credit_ledger',
        'booking_intake_forms',
        'booking_intake_responses',
        'booking_slot_analytics'
    ]) as table_name
),
table_check AS (
    SELECT 
        rt.table_name,
        CASE WHEN t.table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
    FROM required_tables rt
    LEFT JOIN information_schema.tables t ON t.table_name = rt.table_name AND t.table_schema = 'public'
),
required_columns AS (
    SELECT * FROM (VALUES 
        ('appointments', 'calendar_id'),
        ('appointments', 'contact_id'),
        ('appointments', 'status'),
        ('booking_packages', 'session_count'),
        ('contact_booking_credits', 'credits_remaining'),
        ('booking_intake_forms', 'fields')
    ) as t(table_name, column_name)
),
column_check AS (
    SELECT 
        rc.table_name || '.' || rc.column_name as field_name,
        CASE WHEN c.column_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
    FROM required_columns rc
    LEFT JOIN information_schema.columns c ON c.table_name = rc.table_name AND c.column_name = rc.column_name AND c.table_schema = 'public'
)
SELECT 'TABLE_CHECK' as type, table_name, status FROM table_check
UNION ALL
SELECT 'COLUMN_CHECK' as type, field_name, status FROM column_check;
