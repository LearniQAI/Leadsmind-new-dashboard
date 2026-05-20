-- Disable RLS on form governance, logging, and operational tables to prevent policy violations
ALTER TABLE public.form_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_presence DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_beta_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_feature_flags DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding DISABLE ROW LEVEL SECURITY;
