-- Emergency remediation: anonymous partial submissions must be mediated by the
-- application, because an anon JWT cannot prove ownership of a caller-supplied
-- session_id. The public route uses a server-held opaque owner secret instead.
ALTER TABLE public.form_partial_submissions
  ADD COLUMN IF NOT EXISTS owner_token_hash text;

DROP POLICY IF EXISTS "Allow public insert/update of partial submissions" ON public.form_partial_submissions;
DROP POLICY IF EXISTS "Allow workspace member full access to partial submissions" ON public.form_partial_submissions;
REVOKE ALL PRIVILEGES ON TABLE public.form_partial_submissions FROM anon;

CREATE POLICY "Workspace members manage partial submissions"
  ON public.form_partial_submissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_partial_submissions.form_id
      AND check_workspace_access(f.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.forms f
    WHERE f.id = form_partial_submissions.form_id
      AND check_workspace_access(f.workspace_id)
  ));

-- Form governance records inherit authorization from their parent form.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['form_audit_logs','form_beta_feedback','form_diagnostics_logs','form_presence','form_versions'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Workspace members manage ' || t, t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = %I.form_id AND check_workspace_access(f.workspace_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.forms f WHERE f.id = %I.form_id AND check_workspace_access(f.workspace_id)))
    $p$, 'Workspace members manage ' || t, t, t, t);
  END LOOP;
END $$;

-- Global form flags are readable by signed-in users; only platform/service code
-- should change them (no authenticated write policy).
DROP POLICY IF EXISTS "Authenticated users read form feature flags" ON public.form_feature_flags;
CREATE POLICY "Authenticated users read form feature flags"
  ON public.form_feature_flags FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage own onboarding" ON public.user_onboarding;
CREATE POLICY "Users manage own onboarding" ON public.user_onboarding FOR ALL TO authenticated
  USING (user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Workspace members manage lead capture" ON public.lead_capture;
CREATE POLICY "Workspace members manage lead capture" ON public.lead_capture FOR ALL TO authenticated
  USING (check_workspace_access(source_workspace_id))
  WITH CHECK (check_workspace_access(source_workspace_id));

DROP POLICY IF EXISTS "Workspace members manage certificate templates" ON public.lms_certificate_templates;
CREATE POLICY "Workspace members manage certificate templates" ON public.lms_certificate_templates FOR ALL TO authenticated
  USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Workspace members manage redirects" ON public.redirects;
CREATE POLICY "Workspace members manage redirects" ON public.redirects FOR ALL TO authenticated
  USING (check_workspace_access(workspace_id))
  WITH CHECK (check_workspace_access(workspace_id));

-- These are default partitions. Their project_id links each row to a workspace.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['seo_competitor_keywords_default','seo_keyword_performance_default','seo_rank_history_default'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Workspace members manage ' || t, t);
    EXECUTE format($p$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.seo_projects p WHERE p.id = %I.project_id AND check_workspace_access(p.workspace_id)))
      WITH CHECK (EXISTS (SELECT 1 FROM public.seo_projects p WHERE p.id = %I.project_id AND check_workspace_access(p.workspace_id)))
    $p$, 'Workspace members manage ' || t, t, t, t);
  END LOOP;
END $$;
