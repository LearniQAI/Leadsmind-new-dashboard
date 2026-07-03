-- Fix for Feature 8: Missing session_count column in booking_packages
-- Discovered via Health Check

DO $$
BEGIN
    -- Check if total_credits exists and rename it to session_count for Feature 8 compliance
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_packages' AND column_name='total_credits') THEN
        ALTER TABLE booking_packages RENAME COLUMN total_credits TO session_count;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='booking_packages' AND column_name='session_count') THEN
        ALTER TABLE booking_packages ADD COLUMN session_count INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;
