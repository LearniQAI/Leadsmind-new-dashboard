-- Migration: Sprint 9 Experian TrueID & OCR Columns
-- File: supabase/migrations/20260623000000_sprint9_experian_ocr.sql

-- 1. Alter kyc_documents to add ocr_extracted_data JSONB
ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS ocr_extracted_data JSONB DEFAULT '{}'::jsonb;

-- 2. Alter kyc_checks to add result TEXT
ALTER TABLE public.kyc_checks 
ADD COLUMN IF NOT EXISTS result TEXT;
