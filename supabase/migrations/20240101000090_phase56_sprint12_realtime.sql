-- supabase/migrations/phase56_sprint12_realtime.sql

-- Alter Presence table to track current editing section and roles
ALTER TABLE public.form_presence 
ADD COLUMN IF NOT EXISTS editing_section VARCHAR,
ADD COLUMN IF NOT EXISTS is_editor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS client_id VARCHAR;

-- Index for expiring old sessions efficiently
CREATE INDEX IF NOT EXISTS idx_form_presence_last_active ON public.form_presence(last_active_at);
