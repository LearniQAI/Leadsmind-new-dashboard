import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;

export async function GET(req: NextRequest) {
  try {
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const employeeId = req.nextUrl.searchParams.get('employeeId')
    let query = adminClient
      .from('warnings')
      .select('*, employees(first_name, last_name, email, avatar_url)')
      .eq('workspace_id', workspaceId)

    // Non-HR/non-admin users can only see their own warnings.
    if (!ALLOWED_HR_ROLES.includes(role as any)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp) return NextResponse.json({ warnings: [] })
      query = query.eq('employee_id', emp.id)
    } else if (employeeId) {
      query = query.eq('employee_id', employeeId)
    }

    const { data, error } = await query.order('warning_date', { ascending: false })
    if (error) throw error;
    return NextResponse.json({ warnings: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.warnings.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json()
    const { employeeId, reason, notes, warningDate } = body

    if (!employeeId || !reason) {
      return NextResponse.json({ error: 'employeeId and reason are required' }, { status: 400 })
    }

    const { data: employee, error: empErr } = await adminClient
      .from('employees')
      .select('id, first_name, last_name, email')
      .eq('id', employeeId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (empErr) throw empErr;
    if (!employee) throw new NotFoundError('Employee');

    const { data: warning, error } = await adminClient
      .from('warnings')
      .insert({
        workspace_id: workspaceId,
        employee_id: employeeId,
        issued_by: userId,
        reason,
        notes: notes || null,
        warning_date: warningDate || new Date().toISOString().slice(0, 10),
      })
      .select()
      .single()

    if (error) throw error;

    // Notify the employee by email, if they have one on file. Best-effort: a failed
    // notification must never roll back the (already persisted) warning record —
    // same pattern as the payroll route's owner-notification email.
    if (employee.email) {
      await sendEmail({
        to: employee.email,
        subject: 'A warning has been issued on your employee record',
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #f59e0b;">Warning Notice</h2>
            <p>Hi ${employee.first_name},</p>
            <p>A warning has been recorded on your employee record${warning.warning_date ? ` on ${warning.warning_date}` : ''}.</p>
            <p style="padding:12px; background:#f8f8f8; border-radius:8px;"><strong>Reason:</strong> ${reason}</p>
            <p>Please contact HR if you have any questions.</p>
          </div>
        `,
      }).catch((err) => logger.error({ err, warningId: warning.id }, 'hr.warnings.notification_email.failed'))
    }

    return NextResponse.json({ success: true, warning })
  } catch (err: any) {
    logger.error({ err }, 'hr.warnings.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('warnings')
      .delete()
      .eq('id', id).eq('workspace_id', workspaceId)
      .select('id')

    if (error) throw error;
    if (!data || data.length === 0) throw new NotFoundError('Warning');
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'hr.warnings.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
