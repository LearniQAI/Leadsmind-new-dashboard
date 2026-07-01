-- Migration: LMS Global Configurations & Results Tracker
-- File: supabase/migrations/20260531000004_lms_global_configs_and_analytics.sql

-- 1. Add is_active column to public.modules
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add settings column to public.lms_quizzes
ALTER TABLE public.lms_quizzes ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- 3. Add metadata column to public.lms_quiz_submissions
ALTER TABLE public.lms_quiz_submissions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
