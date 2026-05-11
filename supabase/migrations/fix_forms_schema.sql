-- Migration to fix missing config column in forms table
ALTER TABLE public.forms 
ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}';

-- Migration to ensure status column exists in forms (if missing)
ALTER TABLE public.forms
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
