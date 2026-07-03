-- Phase 31: Internal Meet Mode Support

-- Update meeting_mode check constraint to include internal_meet
ALTER TABLE public.booking_calendars DROP CONSTRAINT IF EXISTS booking_calendars_meeting_mode_check;
ALTER TABLE public.booking_calendars ADD CONSTRAINT booking_calendars_meeting_mode_check 
CHECK (meeting_mode IN ('google_meet', 'zoom', 'phone', 'in_person', 'custom_link', 'client_choice', 'internal_meet'));

-- Default some to internal_meet if they are currently custom_link with no location
UPDATE public.booking_calendars 
SET meeting_mode = 'internal_meet' 
WHERE meeting_mode = 'custom_link' AND (location IS NULL OR location = '');
