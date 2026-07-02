-- Phase 94: Email Builder & Brand Kit Migration
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS brand_color_primary TEXT DEFAULT '#2563eb';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT DEFAULT '#080f28';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS brand_font_default TEXT DEFAULT 'Inter';

ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS builder_json JSONB DEFAULT '[]';
