import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/payslips/me
 *
 * Self-service: returns ONLY the authenticated caller's own payslips, scoped to their
 * real active workspace and their own employee record. Unlike GET /api/hr/payroll (which
 * requires admin/owner/hr/payroll and returns every payslip in the workspace), this route
 * has no role requirement beyond real workspace membership -- any employee can call it,
 * and it can only ever return rows tied to an employees row whose email matches their own
 * real session email (the same self-access convention already used by
 * GET /api/hr/warnings and GET /api/hr/employees). Backed by the payslips RLS policy in
 * 20260907170000_payslips_self_service_rls.sql for defense-in-depth, but this route uses
 * the admin client and does the same scoping explicitly regardless.
 */
export async function GET(req: NextRequest) {
  try {
    const { workspaceId, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { data: employee, error: empErr } = await adminClient
      .from('employees')
      .select('id, first_name, last_name, email, salary, salary_frequency')
      .eq('workspace_id', workspaceId)
      .eq('email', userEmail)
      .maybeSingle()

    if (empErr) throw empErr;
    if (!employee) {
      // Not every workspace member has an employees record (e.g. a client-facing role
      // with no HR profile) -- that's a real, unremarkable state, not an error.
      return NextResponse.json({ payslips: [], employee: null })
    }

    const { data: payslips, error } = await adminClient
      .from('payslips')
      .select('*, payroll_runs(period_start, period_end, period_label, status, paid_at)')
      .eq('workspace_id', workspaceId)
      .eq('employee_id', employee.id)
      .order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ payslips: payslips ?? [], employee })
  } catch (err: any) {
    logger.error({ err }, 'hr.payslips.me.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
