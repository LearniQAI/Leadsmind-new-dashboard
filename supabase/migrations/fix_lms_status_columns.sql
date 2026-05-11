-- Migration to fix missing status columns across subsystems
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

ALTER TABLE public.modules 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Sync published boolean with status for backward compatibility
UPDATE public.courses SET status = 'published' WHERE published = true;
UPDATE public.courses SET status = 'draft' WHERE published = false;
