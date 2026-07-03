-- Migration: Course Commerce & Access Control Settings
-- File: supabase/migrations/20260611000001_course_commerce_and_access.sql

-- 1. Alter public.courses for pricing models & enrolment caps
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS pricing_model TEXT DEFAULT 'free' CHECK (pricing_model IN ('free', 'one_time', 'subscription', 'hybrid'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS subscription_interval TEXT CHECK (subscription_interval IN ('month', 'year'));
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS enrolment_cap INTEGER DEFAULT NULL;

-- 2. Alter public.course_lessons for visibility controls
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS access_level TEXT DEFAULT 'enrolled' CHECK (access_level IN ('public', 'enrolled', 'paid'));

-- 3. Alter public.enrollments for payment states and access tracking
-- Drop any legacy check constraints on access_type if present
DO $$
BEGIN
    ALTER TABLE public.enrollments DROP CONSTRAINT IF EXISTS enrollments_access_type_check;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS access_type TEXT DEFAULT 'full';
-- Add updated check constraint for (full, partial, drip)
ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_access_type_check CHECK (access_type IN ('full', 'partial', 'drip'));

ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'free' CHECK (payment_status IN ('free', 'paid', 'pending', 'failed', 'refunded'));
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS subscription_interval TEXT CHECK (subscription_interval IN ('month', 'year'));
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- 4. Alter public.course_progress and public.lesson_progress for detailed analytics tracking
ALTER TABLE public.course_progress ADD COLUMN IF NOT EXISTS progress_seconds INTEGER DEFAULT 0;
ALTER TABLE public.course_progress ADD COLUMN IF NOT EXISTS interaction_attempts INTEGER DEFAULT 0;

ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS progress_seconds INTEGER DEFAULT 0;
ALTER TABLE public.lesson_progress ADD COLUMN IF NOT EXISTS interaction_attempts INTEGER DEFAULT 0;
