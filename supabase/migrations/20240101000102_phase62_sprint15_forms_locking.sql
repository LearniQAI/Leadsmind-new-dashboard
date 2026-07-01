-- Add locking mechanism to forms
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS locked_by VARCHAR,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
