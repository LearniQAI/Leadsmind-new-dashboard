-- Add status column to pages table
ALTER TABLE public.pages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Update existing rows based on is_published if needed
UPDATE public.pages SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;
