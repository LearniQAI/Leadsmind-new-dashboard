-- supabase/migrations/phase58_sprint15_operational.sql

-- Form Beta Feedback Table
CREATE TABLE IF NOT EXISTS public.form_beta_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  user_email VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- 'bug' | 'feature' | 'general'
  message TEXT NOT NULL,
  diagnostics JSONB,
  session_trace VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Form Feature Flags Table
CREATE TABLE IF NOT EXISTS public.form_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert Default Feature Flags
INSERT INTO public.form_feature_flags (flag_key, is_enabled, description)
VALUES 
  ('maintenance_mode', false, 'Puts the builder/workspace in read-only maintenance mode'),
  ('ai_generation_beta', true, 'Enables preview of the AI form generation tools'),
  ('realtime_collaboration', true, 'Enables real-time participant cursor tracking')
ON CONFLICT (flag_key) DO NOTHING;

-- User Onboarding Table
CREATE TABLE IF NOT EXISTS public.user_onboarding (
  user_email VARCHAR PRIMARY KEY,
  checklist_completed JSONB DEFAULT '[]'::jsonb,
  skipped BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
