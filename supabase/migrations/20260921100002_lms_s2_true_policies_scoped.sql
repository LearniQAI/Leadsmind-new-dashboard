-- LMS security batch 1 / S2: USING(true) on {public} across six LMS tables.
-- Real access needs (grepped): remedial/struggle tables are only touched via service-role code paths;
-- the expert admin UI (workspaces/[id]/experts/*) uses the instructor's browser client and needs
-- workspace-member CRUD. No student browser path exists (LiveHelpWidget has no importers).

-- lms_remedial_assignments (holds validation_questions incl. correctAnswer): members read only;
-- students get NO direct access (remedial page/routes use the service role).
DROP POLICY IF EXISTS "Service role full access assignments" ON public.lms_remedial_assignments;
DROP POLICY IF EXISTS "Student select assignments" ON public.lms_remedial_assignments;
CREATE POLICY "service_role only lms_remedial_assignments" ON public.lms_remedial_assignments
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "workspace members read lms_remedial_assignments" ON public.lms_remedial_assignments
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c
                 WHERE c.id = lms_remedial_assignments.course_id
                   AND public.check_workspace_access(c.workspace_id)));

-- lms_student_struggle_scores: keep the existing workspace-member SELECT; drop the open ALL.
DROP POLICY IF EXISTS "Service role full access struggle scores" ON public.lms_student_struggle_scores;
CREATE POLICY "service_role only lms_student_struggle_scores" ON public.lms_student_struggle_scores
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Expert tables: workspace-member CRUD, chained back to lms_expert_profiles.workspace_id.
DROP POLICY IF EXISTS "Service role full access experts" ON public.lms_expert_profiles;
DROP POLICY IF EXISTS "Workspace members select experts" ON public.lms_expert_profiles;
CREATE POLICY "service_role only lms_expert_profiles" ON public.lms_expert_profiles
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "workspace members manage lms_expert_profiles" ON public.lms_expert_profiles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (public.check_workspace_access(workspace_id))
  WITH CHECK (public.check_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Service role full access sessions" ON public.lms_expert_sessions;
DROP POLICY IF EXISTS "Workspace members select sessions" ON public.lms_expert_sessions;
CREATE POLICY "service_role only lms_expert_sessions" ON public.lms_expert_sessions
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "workspace members manage lms_expert_sessions" ON public.lms_expert_sessions
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lms_expert_profiles p
                 WHERE p.id = lms_expert_sessions.expert_id AND public.check_workspace_access(p.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lms_expert_profiles p
                 WHERE p.id = lms_expert_sessions.expert_id AND public.check_workspace_access(p.workspace_id)));

DROP POLICY IF EXISTS "Service role full access availabilities" ON public.lms_expert_availabilities;
DROP POLICY IF EXISTS "Workspace members select availabilities" ON public.lms_expert_availabilities;
CREATE POLICY "service_role only lms_expert_availabilities" ON public.lms_expert_availabilities
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "workspace members manage lms_expert_availabilities" ON public.lms_expert_availabilities
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lms_expert_profiles p
                 WHERE p.id = lms_expert_availabilities.expert_id AND public.check_workspace_access(p.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lms_expert_profiles p
                 WHERE p.id = lms_expert_availabilities.expert_id AND public.check_workspace_access(p.workspace_id)));

DROP POLICY IF EXISTS "Service role full access recordings" ON public.lms_session_recordings;
DROP POLICY IF EXISTS "Public select recordings" ON public.lms_session_recordings;
CREATE POLICY "service_role only lms_session_recordings" ON public.lms_session_recordings
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "workspace members manage lms_session_recordings" ON public.lms_session_recordings
  AS PERMISSIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.lms_expert_sessions s
                 JOIN public.lms_expert_profiles p ON p.id = s.expert_id
                 WHERE s.id = lms_session_recordings.session_id AND public.check_workspace_access(p.workspace_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.lms_expert_sessions s
                 JOIN public.lms_expert_profiles p ON p.id = s.expert_id
                 WHERE s.id = lms_session_recordings.session_id AND public.check_workspace_access(p.workspace_id)));
