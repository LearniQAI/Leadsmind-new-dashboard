-- Lock down remaining tables with permissive USING (true) / WITH CHECK (true)
-- policies, or with RLS disabled/never-enabled, that allowed anonymous or
-- cross-tenant read/write.
--
-- Confirmed no legitimate app code path is broken by these changes (see
-- inline notes per section); where a legitimate path DID depend on an open
-- policy, the app code itself was updated alongside this migration
-- (src/app/actions/help.ts: seedHelpArticles now uses the admin client).

-- =====================================================================
-- 1. booking_leases — "Public access for booking_leases" (USING (true), FOR
--    ALL) let any anon/authenticated caller read/alter/delete any
--    workspace's leases. All real callers (scheduling.ts, refunds.ts,
--    payfast.ts, payfast webhook route) use createAdminClient(), which
--    bypasses RLS entirely and is unaffected by removing this policy.
-- =====================================================================

DROP POLICY IF EXISTS "Public access for booking_leases" ON public.booking_leases;

-- =====================================================================
-- 2. lms_session_rsvps / lms_session_chats — were fully open
--    (USING (true), FOR ALL). Students are CRM contacts, not
--    workspace_members, so scoping goes through enrollments/contacts
--    (same join pattern as course_content_chunks,
--    20260824000000_course_qa_rag.sql:79-86). LiveHelpWidget.tsx (student
--    widget) only ever touches its own contact_id/sender_id rows and reads
--    the shared chat feed for its own enrolled session, so this is not a
--    regression for that caller. SessionDetailsModal.tsx (workspace admin
--    view) is covered by the workspace-member policy.
-- =====================================================================

DROP POLICY IF EXISTS "Public select/insert/delete rsvps" ON public.lms_session_rsvps;

CREATE POLICY "Workspace members manage lms_session_rsvps" ON public.lms_session_rsvps
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lms_expert_sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = lms_session_rsvps.session_id
      AND check_workspace_access(c.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lms_expert_sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = lms_session_rsvps.session_id
      AND check_workspace_access(c.workspace_id)
  ));

CREATE POLICY "Enrolled students manage own lms_session_rsvps" ON public.lms_session_rsvps
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = lms_session_rsvps.contact_id
      AND ct.email = auth.jwt() ->> 'email'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.contacts ct
    WHERE ct.id = lms_session_rsvps.contact_id
      AND ct.email = auth.jwt() ->> 'email'
  ));

DROP POLICY IF EXISTS "Public select/insert chats" ON public.lms_session_chats;

CREATE POLICY "Workspace members manage lms_session_chats" ON public.lms_session_chats
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lms_expert_sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = lms_session_chats.session_id
      AND check_workspace_access(c.workspace_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lms_expert_sessions s
    JOIN public.courses c ON c.id = s.course_id
    WHERE s.id = lms_session_chats.session_id
      AND check_workspace_access(c.workspace_id)
  ));

CREATE POLICY "Enrolled students read lms_session_chats" ON public.lms_session_chats
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.lms_expert_sessions s
    JOIN public.enrollments e ON e.course_id = s.course_id
    JOIN public.contacts ct ON ct.id = e.contact_id
    WHERE s.id = lms_session_chats.session_id
      AND ct.email = auth.jwt() ->> 'email'
  ));

CREATE POLICY "Enrolled students send lms_session_chats" ON public.lms_session_chats
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.lms_expert_sessions s
    JOIN public.enrollments e ON e.course_id = s.course_id
    JOIN public.contacts ct ON ct.id = e.contact_id
    WHERE s.id = lms_session_chats.session_id
      AND ct.email = auth.jwt() ->> 'email'
      AND ct.id = lms_session_chats.sender_id
  ));

-- =====================================================================
-- 3. help_articles / help_screenshots / help_update_queue — global (not
--    workspace-scoped) content. Public SELECT is intentional and unchanged.
--    "Administrative Write Access ..." (USING (true), FOR ALL, no TO
--    restriction) let anyone deface the KB / seed queue. No platform-admin
--    role concept exists anywhere in this codebase to gate writes by, and
--    the only two write callers found in src/ are:
--      - seedHelpArticles() (src/app/actions/help.ts) — runs unauthenticated
--        on every /articles page load (src/app/articles/page.tsx:13) to
--        upsert the KB. Switched to createAdminClient() alongside this
--        migration so it keeps working under a service_role-only policy.
--      - submitHelpFeedback() (src/app/actions/help.ts:269) — already
--        broken today: it filters/updates help_articles by a `workspace_id`
--        column that does not exist on this table (confirmed against the
--        live schema), so it already errors on every call regardless of
--        RLS. No behavior change.
--    No writer was found anywhere in src/ for help_screenshots or
--    help_update_queue.
-- =====================================================================

DROP POLICY IF EXISTS "Administrative Write Access on Help Articles" ON public.help_articles;
CREATE POLICY "Administrative Write Access on Help Articles"
  ON public.help_articles FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Administrative Write Access on Help Screenshots" ON public.help_screenshots;
CREATE POLICY "Administrative Write Access on Help Screenshots"
  ON public.help_screenshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Administrative Write Access on help_update_queue" ON public.help_update_queue;
CREATE POLICY "Administrative Write Access on help_update_queue"
  ON public.help_update_queue FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- =====================================================================
-- 4. quick_replies — already fixed in
--    20260721000003_fix_quick_replies_rls.sql. No action needed.
-- =====================================================================

-- =====================================================================
-- 5. page_analytics / page_submissions — public INSERT policies used
--    WITH CHECK (true): any caller could tag an analytics event or a lead
--    submission with an arbitrary workspace_id unrelated to the page_id
--    actually referenced. No app code currently reads or writes either
--    table (confirmed via repo-wide search), so this is zero-risk to
--    tighten. Mirrors the appointment_workspace_matches() pattern from
--    20260721000002_tighten_calendar_public_policies.sql.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.page_workspace_matches(p_page_id uuid, p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pages
    WHERE pages.id = p_page_id
      AND pages.workspace_id = p_workspace_id
  );
$$;

REVOKE ALL ON FUNCTION public.page_workspace_matches(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.page_workspace_matches(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "Public can insert analytics" ON public.page_analytics;
CREATE POLICY "Public can insert analytics" ON public.page_analytics
  FOR INSERT
  WITH CHECK (page_id IS NOT NULL AND public.page_workspace_matches(page_id, workspace_id));

DROP POLICY IF EXISTS "Public can insert submissions" ON public.page_submissions;
CREATE POLICY "Public can insert submissions" ON public.page_submissions
  FOR INSERT
  WITH CHECK (page_id IS NOT NULL AND public.page_workspace_matches(page_id, workspace_id));

-- =====================================================================
-- 6. meet_attendance_logs — "Public access for meet_attendance_logs" used
--    appointment_workspace_matches(appointment_id, workspace_id), which only
--    proves the row is internally consistent (a real appointment/workspace
--    pair), not that the caller owns/attended that appointment. There is no
--    caller-identity column on this table (participant_name/email are
--    free-text, client-supplied) and no legitimate direct-table access is
--    needed: every real caller (getAppointmentById, logParticipantJoin,
--    logParticipantLeave in src/app/actions/calendar/appointments.ts, used
--    by the public src/app/meet/[id]/page.tsx join flow) already goes
--    through createAdminClient(), which bypasses RLS. Dropping this policy
--    removes the direct-access path entirely, leaving only the correctly
--    workspace-scoped "Workspace access for meet_attendance_logs" policy for
--    authenticated dashboard use.
-- =====================================================================

DROP POLICY IF EXISTS "Public access for meet_attendance_logs" ON public.meet_attendance_logs;

-- =====================================================================
-- 7. Form-governance tables — RLS was disabled outright in
--    20240101000102_phase59_sprint15_rls_fix.sql ("to prevent policy
--    violations", no further recorded reasoning; git history shows it
--    bundled with an unrelated UI tweak, i.e. an expedient hotfix, not a
--    deliberate architectural decision). Correct workspace-scoped policies
--    already exist for all six tables (added in
--    20260822000100_secure_partial_submissions_and_restore_rls.sql) but
--    have been inert this whole time since RLS was off. Confirmed via
--    caller audit that all six are only ever touched by authenticated
--    dashboard/builder code (form_versions' one public-page reader,
--    src/app/public/forms/[id]/page.tsx, uses createAdminClient() and is
--    unaffected) — re-enabling RLS breaks nothing live.
-- =====================================================================

ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_beta_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 8. Workspace-scoped tables that never had RLS enabled at all. Correct
--    policies already exist for all four (from 20260822000100) but were
--    inert. No app code anywhere calls lead_capture, lms_certificate_templates,
--    or redirects directly (lead_capture is populated only by the
--    SECURITY DEFINER trigger fn_capture_standalone_lead(), which runs as
--    the migration-owning role and bypasses RLS as the table owner).
--    form_diagnostics_logs has one live (read-only, authenticated-dashboard)
--    caller, DiagnosticsService via DiagnosticsDashboard.tsx; its only
--    write path (logError(), called from FailureMonitor/RuntimeProfiler/
--    SessionTracer) is unreachable dead code today.
-- =====================================================================

ALTER TABLE public.lead_capture ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lms_certificate_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_diagnostics_logs ENABLE ROW LEVEL SECURITY;
