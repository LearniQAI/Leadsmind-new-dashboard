-- Phase 29: Appointment Assignee Support

-- Add user_id column to appointments for Round Robin and personal assignments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'appointments' AND COLUMN_NAME = 'user_id') THEN
        ALTER TABLE public.appointments ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add index for performance on assignee lookups
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);
