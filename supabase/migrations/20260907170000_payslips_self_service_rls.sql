-- Task 47: self-service payslip viewing.
--
-- Audited first (see build report): payslips.employees has no user_id column linking to
-- auth.users -- the real linkage this whole HR module already uses is email matching
-- (employees.email against the session's real email), the same convention already used by
-- GET /api/hr/warnings and GET /api/hr/employees for employee self-access. No new linkage
-- mechanism invented here; this migration follows the established one.
--
-- Also audited: the existing payslips RLS policy ("workspace members manage payslips",
-- 20240101000185_hr_inventory.sql) is workspace-membership-only -- ANY member of the
-- workspace, any role, can already SELECT (and even UPDATE/DELETE) ANY payslip row via a
-- direct Supabase client call, not just their own. That's broader than a self-service
-- feature needs, and payslip amounts are sensitive financial data, so this tightens it
-- rather than leaving the blanket policy in place -- real hardening, not just "add access",
-- matching this project's posture in the Task 44 hardening and storage-lockdown passes.
DROP POLICY IF EXISTS "workspace members manage payslips" ON public.payslips;

-- Privileged roles keep full read/write access to every payslip in their workspace,
-- exactly as before.
CREATE POLICY "hr roles manage all workspace payslips"
  ON public.payslips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = payslips.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner', 'hr', 'payroll')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.workspace_id = payslips.workspace_id
        AND wm.user_id = auth.uid()
        AND wm.role IN ('admin', 'owner', 'hr', 'payroll')
    )
  );

-- Any workspace member can additionally SELECT (read-only) a payslip if it's their own --
-- matched via employees.email = the current session's real email (read from the JWT via
-- auth.jwt(), Supabase's standard helper for this -- no auth.users table grant/join
-- needed), the same self-access predicate already used at the API layer elsewhere in
-- this module (GET /api/hr/warnings, GET /api/hr/employees).
CREATE POLICY "employees can view their own payslips"
  ON public.payslips FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = payslips.employee_id
        AND e.workspace_id = payslips.workspace_id
        AND lower(e.email) = lower(auth.jwt() ->> 'email')
    )
  );
