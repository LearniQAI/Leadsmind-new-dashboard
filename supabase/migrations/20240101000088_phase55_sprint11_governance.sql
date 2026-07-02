-- supabase/migrations/phase55_sprint11_governance.sql

-- Form Versions Table
CREATE TABLE IF NOT EXISTS public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by VARCHAR
);

CREATE INDEX IF NOT EXISTS idx_form_versions_form ON public.form_versions(form_id, version_number);

-- Form Audit Logs Table
CREATE TABLE IF NOT EXISTS public.form_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  actor VARCHAR NOT NULL,
  summary TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_form_audit_logs_form ON public.form_audit_logs(form_id);

-- Form Collaboration Presence Scaffold
CREATE TABLE IF NOT EXISTS public.form_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  user_email VARCHAR NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, user_email)
);
