-- supabase/migrations/phase57_sprint13_monitoring.sql

-- Form Diagnostics Table
CREATE TABLE IF NOT EXISTS public.form_diagnostics_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID REFERENCES public.forms(id) ON DELETE CASCADE,
  error_type VARCHAR NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for timeline query performance
CREATE INDEX IF NOT EXISTS idx_diagnostics_logs_form ON public.form_diagnostics_logs(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_diagnostics_logs_type ON public.form_diagnostics_logs(error_type);
