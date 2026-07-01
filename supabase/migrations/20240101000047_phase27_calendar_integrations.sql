-- Phase 30: Calendar Location & Static Links

-- Add location/meeting_link to calendars
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'booking_calendars' AND COLUMN_NAME = 'location') THEN
        ALTER TABLE public.booking_calendars ADD COLUMN location TEXT;
    END IF;
END $$;
