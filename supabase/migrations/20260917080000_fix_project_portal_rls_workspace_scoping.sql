-- Projects audit (2026-09-17) flagged "clients view own projects" / "clients view own project
-- tasks" (20240101000181_customer_portal_rls.sql) as matching a portal contact purely by
-- email, with no workspace_id check. Currently masked because the only page that queries
-- projects for the portal uses the admin client with its own explicit workspace_id filter, but
-- the policy itself is a live cross-tenant hole: the student/portal magic-link login
-- (src/app/auth/student/verify/route.ts) mints a real Supabase Auth session keyed only on
-- email, so any session-scoped client would let a contact whose email exists in two different
-- workspaces read the OTHER workspace's projects and project tasks too.
--
-- Fix follows the same convention already established in this codebase for this exact
-- class of bug (20260907170000_payslips_self_service_rls.sql): keep the email match, but
-- additionally require the contact row to belong to the SAME workspace as the row being
-- read, so a same-email contact in a different workspace can no longer satisfy the policy.

DROP POLICY IF EXISTS "clients view own projects" ON public.projects;
CREATE POLICY "clients view own projects" ON public.projects
  FOR SELECT TO authenticated
  USING (
    contact_id IN (
      SELECT id FROM public.contacts
      WHERE email = auth.jwt() ->> 'email'
        AND workspace_id = projects.workspace_id
    )
  );

DROP POLICY IF EXISTS "clients view own project tasks" ON public.project_tasks;
CREATE POLICY "clients view own project tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.contacts c ON c.id = p.contact_id
      WHERE c.email = auth.jwt() ->> 'email'
        AND c.workspace_id = p.workspace_id
    )
  );
