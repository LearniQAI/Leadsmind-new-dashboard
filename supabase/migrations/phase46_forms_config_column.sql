-- Sprint 2: Add config column to forms table for multi-step and logic rule storage
ALTER TABLE public.forms ADD COLUMN IF NOT EXISTS config JSONB NOT NULL DEFAULT '{}';
