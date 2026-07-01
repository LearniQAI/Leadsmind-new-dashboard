-- Phase 28: Standardizing Business Hour Defaults

-- Update existing calendars that have empty availability to a standard 9-5 work week
UPDATE public.booking_calendars
SET availability = '{
    "1": [{"start": "09:00", "end": "17:00"}],
    "2": [{"start": "09:00", "end": "17:00"}],
    "3": [{"start": "09:00", "end": "17:00"}],
    "4": [{"start": "09:00", "end": "17:00"}],
    "5": [{"start": "09:00", "end": "17:00"}]
}'::JSONB
WHERE availability = '{"0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": []}'::JSONB 
   OR availability IS NULL;

-- Ensure new calendars also get this default
ALTER TABLE public.booking_calendars 
ALTER COLUMN availability SET DEFAULT '{
    "1": [{"start": "09:00", "end": "17:00"}],
    "2": [{"start": "09:00", "end": "17:00"}],
    "3": [{"start": "09:00", "end": "17:00"}],
    "4": [{"start": "09:00", "end": "17:00"}],
    "5": [{"start": "09:00", "end": "17:00"}]
}'::JSONB;
