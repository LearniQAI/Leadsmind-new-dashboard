-- Add workspace settings for individual Resend and Twilio credentials
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS resend_api_key TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS email_from_name TEXT DEFAULT 'LeadsMind';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS email_from_address TEXT DEFAULT 'onboarding@resend.dev';
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_sid TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_token TEXT;
ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS twilio_number TEXT;
