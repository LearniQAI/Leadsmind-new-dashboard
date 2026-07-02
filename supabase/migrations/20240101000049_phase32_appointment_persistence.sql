-- Phase 32: Appointment Mode Persistence

DO $$ 
BEGIN 
    -- Add meeting_link to appointments
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'meeting_link' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.appointments ADD COLUMN meeting_link TEXT;
    END IF;

    -- Add meeting_mode to appointments (for overrides)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'meeting_mode' AND TABLE_SCHEMA = 'public') THEN
        ALTER TABLE public.appointments ADD COLUMN meeting_mode TEXT CHECK (meeting_mode IN ('google_meet', 'zoom', 'phone', 'in_person', 'custom_link', 'client_choice', 'internal_meet'));
    END IF;
END $$;
