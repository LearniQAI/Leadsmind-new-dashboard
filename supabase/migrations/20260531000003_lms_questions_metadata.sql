-- Migration: Add metadata JSONB column to lms_questions for advanced formats
-- File: supabase/migrations/20260531000003_lms_questions_metadata.sql

ALTER TABLE public.lms_questions 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
