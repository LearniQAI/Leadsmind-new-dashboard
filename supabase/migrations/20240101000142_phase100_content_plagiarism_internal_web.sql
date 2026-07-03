-- Migration: Phase 100 - Add internal/web check fields to content_plagiarism_checks

ALTER TABLE public.content_plagiarism_checks
    ADD COLUMN IF NOT EXISTS internal_score INTEGER DEFAULT 100,
    ADD COLUMN IF NOT EXISTS internal_matches_json JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS web_score INTEGER,
    ADD COLUMN IF NOT EXISTS web_matches_json JSONB,
    ADD COLUMN IF NOT EXISTS phrases_checked TEXT[],
    ADD COLUMN IF NOT EXISTS serper_credits_used INTEGER DEFAULT 0;
