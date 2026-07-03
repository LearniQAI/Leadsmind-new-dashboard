-- Add status column to websites and funnels
ALTER TABLE public.websites 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

ALTER TABLE public.funnels 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- Update existing rows based on is_published if needed
UPDATE public.websites SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;
UPDATE public.funnels SET status = CASE WHEN is_published THEN 'published' ELSE 'draft' END;
