-- Add publishing metadata columns to public.forms table if they do not exist
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS published_version INT;
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
