-- Migration: Extend Lessons table to support 10 specialized type configurations and metadata profiles
-- File: supabase/migrations/20260531000001_lms_lesson_types.sql

-- 1. Add type column with check constraint for lesson formats
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'Text' 
CHECK (type IN ('Text', 'Video', 'Quiz', 'Assignment', 'PDF', 'Audio', 'Live Session', 'Flashcards', 'Code', 'SCORM'));

-- 2. Add metadata column (JSONB) to hold type-specific states
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Set standard defaults for any legacy lesson entries
UPDATE public.lessons SET type = 'Text' WHERE type IS NULL;
UPDATE public.lessons SET metadata = '{}'::jsonb WHERE metadata IS NULL;
