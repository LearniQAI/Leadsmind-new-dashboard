import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { htmlToPdfBuffer } from '@/lib/pdf/htmlToPdf'
import { renderPayslipHtml } from '@/lib/pdf/payslip-template'
import { toClientError, ForbiddenError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const PAYROLL_ROLES = ['admin', 'owner', 'hr', 'payroll'] as const

/**
 * GET /api/hr/payslips/[id]/download
 *
 * Real payslip PDF download, shared by both the employee self-service view
 * (MyPayslipsView) and the admin payroll view (/hr/payroll). Same self-access
 * convention as GET /api/hr/payslips/me: the workspace + role are resolved
 * from the session (never a client-supplied id), and the payslip row is only
 * ever returned if it belongs to that workspace AND either the caller holds
 * a payroll role (admin/owner/hr/payroll — any employee in the workspace) or
 * the payslip's own employees.email matches the caller's own session email.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { workspaceId, userEmail, role } = await requireWorkspaceRole()
    const adminClient = createAdminClient()

    const { data: slip, error } = await adminClient
      .from('payslips')
      .select('*, employees(first_name, last_name, email), payroll_runs(period_start, period_end, period_label, paid_at)')
      .eq('id', params.id)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (error) throw error
    if (!slip) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 })
    }

    const isPayrollRole = PAYROLL_ROLES.includes(role as any)
    const isOwnPayslip = !!userEmail && slip.employees?.email?.toLowerCase() === userEmail.toLowerCase()
    if (!isPayrollRole && !isOwnPayslip) {
      throw new ForbiddenError('You can only download your own payslip')
    }

    const employeeName = `${slip.employees?.first_name ?? ''} ${slip.employees?.last_name ?? ''}`.trim() || 'Employee'
    const periodLabel = slip.payroll_runs?.period_label ?? 'Payslip'

    const html = renderPayslipHtml({
      employeeName,
      employeeEmail: slip.employees?.email ?? null,
      periodLabel,
      periodStart: slip.payroll_runs?.period_start ?? null,
      periodEnd: slip.payroll_runs?.period_end ?? null,
      issuedAt: slip.created_at,
      paidAt: slip.payroll_runs?.paid_at ?? null,
      grossSalary: slip.gross_salary,
      paye: slip.paye,
      uifEmployee: slip.uif_employee,
      uifEmployer: slip.uif_employer,
      sdl: slip.sdl,
      netSalary: slip.net_salary,
    })

    const pdfBuffer = await htmlToPdfBuffer(html, `Payslip — ${employeeName}`)
    const filename = `Payslip_${employeeName}_${periodLabel}.pdf`.replace(/\s+/g, '_')

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (err: any) {
    logger.error({ err }, 'hr.payslips.download.failed')
    const clientError = toClientError(err)
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status })
  }
}
