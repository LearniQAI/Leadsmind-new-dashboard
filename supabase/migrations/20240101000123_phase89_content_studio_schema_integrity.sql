-- Migration: Phase 89 - Content Studio Relational Database Schema Integrity
-- Run this to update schema columns, data types, and check constraints to align perfectly with the PRD.

-- ==========================================
-- 1. Updates to public.content_studio_documents
-- ==========================================

-- Clean up any existing records to prevent check constraint violations
UPDATE public.content_studio_documents 
SET content_type = 'blog_post' 
WHERE content_type = 'blog';

UPDATE public.content_studio_documents 
SET content_type = 'email_marketing' 
WHERE content_type = 'email';

UPDATE public.content_studio_documents 
SET content_type = 'generic' 
WHERE content_type NOT IN ('blog_post', 'social_instagram', 'social_linkedin', 'social_facebook', 'social_twitter', 'email_marketing', 'newsletter', 'ad_copy', 'sms', 'press_release', 'generic');

UPDATE public.content_studio_documents 
SET status = 'draft' 
WHERE status NOT IN ('draft', 'review', 'ready', 'published', 'template');

-- Alter table queries
ALTER TABLE public.content_studio_documents 
    ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS character_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS grammar_score INTEGER,
    ADD COLUMN IF NOT EXISTS grammar_issues_count INTEGER,
    ADD COLUMN IF NOT EXISTS plagiarism_score INTEGER,
    ADD COLUMN IF NOT EXISTS plagiarism_checked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS seo_score INTEGER,
    ADD COLUMN IF NOT EXISTS seo_target_keyword TEXT,
    ADD COLUMN IF NOT EXISTS meta_description TEXT,
    ADD COLUMN IF NOT EXISTS published_to TEXT[] DEFAULT '{}'::text[];

-- Add check constraints for ENUM parity
ALTER TABLE public.content_studio_documents 
    DROP CONSTRAINT IF EXISTS chk_content_studio_docs_type,
    ADD CONSTRAINT chk_content_studio_docs_type CHECK (content_type IN ('blog_post', 'social_instagram', 'social_linkedin', 'social_facebook', 'social_twitter', 'email_marketing', 'newsletter', 'ad_copy', 'sms', 'press_release', 'generic'));

ALTER TABLE public.content_studio_documents 
    DROP CONSTRAINT IF EXISTS chk_content_studio_docs_status,
    ADD CONSTRAINT chk_content_studio_docs_status CHECK (status IN ('draft', 'review', 'ready', 'published', 'template'));


-- ==========================================
-- 2. Updates to public.content_grammar_checks
-- ==========================================

-- Safely drop old issues_found count if it exists and replace with issues_json
ALTER TABLE public.content_grammar_checks DROP COLUMN IF EXISTS issues_found;
ALTER TABLE public.content_grammar_checks ADD COLUMN IF NOT EXISTS issues_json JSONB DEFAULT '[]'::jsonb;

-- Rename score
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_grammar_checks' AND column_name = 'score') THEN
        ALTER TABLE public.content_grammar_checks RENAME COLUMN score TO overall_score;
    END IF;
END $$;

-- Drop and re-add readability_grade as numeric(4,1)
ALTER TABLE public.content_grammar_checks DROP COLUMN IF EXISTS readability_grade;
ALTER TABLE public.content_grammar_checks ADD COLUMN readability_grade NUMERIC(4,1);

-- Rename detected_tone
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_grammar_checks' AND column_name = 'detected_tone') THEN
        ALTER TABLE public.content_grammar_checks RENAME COLUMN detected_tone TO tone_detected;
    END IF;
END $$;

-- Add remaining required columns
ALTER TABLE public.content_grammar_checks 
    ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS avg_sentence_length NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS passive_voice_percentage NUMERIC(5,1);

-- Rename checked_at
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_grammar_checks' AND column_name = 'checked_at') THEN
        ALTER TABLE public.content_grammar_checks RENAME COLUMN checked_at TO created_at;
    END IF;
END $$;


-- ==========================================
-- 3. Updates to public.content_plagiarism_checks
-- ==========================================

-- Rename matches
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_plagiarism_checks' AND column_name = 'matches') THEN
        ALTER TABLE public.content_plagiarism_checks RENAME COLUMN matches TO matched_sources_json;
    END IF;
END $$;

-- Add columns
ALTER TABLE public.content_plagiarism_checks
    ADD COLUMN IF NOT EXISTS highest_match_url TEXT,
    ADD COLUMN IF NOT EXISTS highest_match_percentage NUMERIC(5,1),
    ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 5;

-- Rename checked_at
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_plagiarism_checks' AND column_name = 'checked_at') THEN
        ALTER TABLE public.content_plagiarism_checks RENAME COLUMN checked_at TO created_at;
    END IF;
END $$;


-- ==========================================
-- 4. Updates to public.content_seo_checks
-- ==========================================

-- Rename seo_score
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_seo_checks' AND column_name = 'seo_score') THEN
        ALTER TABLE public.content_seo_checks RENAME COLUMN seo_score TO overall_score;
    END IF;
END $$;

-- Rename metrics_breakdown
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_seo_checks' AND column_name = 'metrics_breakdown') THEN
        ALTER TABLE public.content_seo_checks RENAME COLUMN metrics_breakdown TO score_breakdown_json;
    END IF;
END $$;

-- Add columns
ALTER TABLE public.content_seo_checks
    ADD COLUMN IF NOT EXISTS competitor_data_json JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS missing_keywords_json JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS keyword_density NUMERIC(5,2),
    ADD COLUMN IF NOT EXISTS readability_grade NUMERIC(4,1),
    ADD COLUMN IF NOT EXISTS meta_description_score INTEGER,
    ADD COLUMN IF NOT EXISTS google_preview_title TEXT,
    ADD COLUMN IF NOT EXISTS google_preview_meta TEXT,
    ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 3;

-- Rename checked_at
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'content_seo_checks' AND column_name = 'checked_at') THEN
        ALTER TABLE public.content_seo_checks RENAME COLUMN checked_at TO created_at;
    END IF;
END $$;
