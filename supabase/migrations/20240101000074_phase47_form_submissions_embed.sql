-- Sprint 3: Form submissions table column alignment for public submissions
-- Ensure form_submissions can store raw field data from public embed

-- Add source_type column to distinguish direct vs embed submissions
ALTER TABLE public.form_submissions 
  ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'embed' 
  CHECK (source_type IN ('embed', 'api', 'internal'));

-- Add user_agent column for basic spam detection scaffolding
ALTER TABLE public.form_submissions 
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Add form_step_count for multi-step tracking
ALTER TABLE public.form_submissions 
  ADD COLUMN IF NOT EXISTS steps_completed INTEGER DEFAULT 1;
