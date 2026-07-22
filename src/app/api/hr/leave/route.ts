import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { ForbiddenError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const ALLOWED_LEAVE_APPROVAL_ROLES = ['admin', 'owner', 'hr'] as const;

// Helper: get all admin/owner user emails for a workspace
async function getWorkspaceAdminEmails(adminClient: ReturnType<typeof createAdminClient>, workspaceId: string): Promise<{id: string, email: string}[]> {
  // Get workspace owner
  const { data: workspace } = await adminClient
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  // Get all admin members
  const { data: adminMembers } = await adminClient
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin')

  const userIds = new Set<string>()
  if (workspace?.owner_id) userIds.add(workspace.owner_id)
  adminMembers?.forEach(m => userIds.add(m.user_id))

  if (userIds.size === 0) return []

  // Get emails from auth.users via supabase admin
  const { data: users } = await adminClient.auth.admin.listUsers()
  return (users?.users ?? [])
    .filter(u => userIds.has(u.id))
    .map(u => ({ id: u.id, email: u.email ?? '' }))
    .filter(u => u.email)
}

// Helper: create in-app notification
async function createNotification(
  adminClient: ReturnType<typeof createAdminClient>,
  workspaceId: string,
  userId: string,
  title: string,
  message: string,
  link: string
) {
  await adminClient.from('notifications').insert({
    workspace_id: workspaceId,
    user_id: userId,
    type: 'team',
    title,
    message,
    link,
    read: false,
  })
}

export async function GET(req: NextRequest) {
  try {
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const employeeId = req.nextUrl.searchParams.get('employeeId')
    let query = adminClient
      .from('leave_requests')
      .select('*, employees(first_name, last_name, email, avatar_url, annual_leave_balance, annual_leave_used, sick_leave_balance, sick_leave_used)')
      .eq('workspace_id', workspaceId)

    // Non-HR/non-admin users can only view their own leave requests
    if (!ALLOWED_LEAVE_APPROVAL_ROLES.includes(role as any)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp) {
        return NextResponse.json({ leaveRequests: [] })
      }
      query = query.eq('employee_id', emp.id)
    } else {
      if (employeeId && employeeId !== 'all') {
        query = query.eq('employee_id', employeeId)
      }
    }

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error;
    return NextResponse.json({ leaveRequests: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.leave.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const body = await req.json()
    delete body.workspace_id;

    // Non-HR/non-admin users can only request leaves for themselves
    if (!ALLOWED_LEAVE_APPROVAL_ROLES.includes(role as any)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp || body.employee_id !== emp.id) {
        throw new ForbiddenError('Unauthorized to request leave for another employee');
      }
    }

    // Validate employee exists (in THIS workspace) and has enough leave balance
    if (body.leave_type === 'annual' || body.leave_type === 'sick') {
      const { data: employee } = await adminClient
        .from('employees')
        .select('first_name, last_name, email, annual_leave_balance, annual_leave_used, sick_leave_balance, sick_leave_used')
        .eq('id', body.employee_id)
        .eq('workspace_id', workspaceId)
        .single()

      if (employee) {
        if (body.leave_type === 'annual') {
          const remaining = (employee.annual_leave_balance ?? 15) - (employee.annual_leave_used ?? 0)
          if (body.days_count > remaining) {
            return NextResponse.json({
              error: `${employee.first_name} only has ${remaining} annual leave days remaining.`
            }, { status: 400 })
          }
        }
        if (body.leave_type === 'sick') {
          const remaining = (employee.sick_leave_balance ?? 30) - (employee.sick_leave_used ?? 0)
          if (body.days_count > remaining) {
            return NextResponse.json({
              error: `${employee.first_name} only has ${remaining} sick leave days remaining.`
            }, { status: 400 })
          }
        }
      }
    }

    const { data, error } = await adminClient
      .from('leave_requests')
      .insert({ ...body, workspace_id: workspaceId })
      .select('*, employees(first_name, last_name, email)')
      .single()

    if (error) throw error;

    const emp = data.employees
    const empName = `${emp?.first_name} ${emp?.last_name}`
    const leaveType = body.leave_type.charAt(0).toUpperCase() + body.leave_type.slice(1)
    const link = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadsmind.io'}/hr/leave`

    // Notify all workspace admins — in-app notification
    const admins = await getWorkspaceAdminEmails(adminClient, workspaceId)
    for (const admin of admins) {
      // In-app bell notification
      await createNotification(
        adminClient,
        workspaceId,
        admin.id,
        'New Leave Request',
        `${empName} has requested ${body.days_count} day(s) of ${leaveType} leave from ${body.start_date} to ${body.end_date}.`,
        link
      )

      // Email notification via Resend
      await sendEmail({
        to: admin.email,
        subject: `Leave Request — ${empName} (${leaveType} Leave)`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #eef2ff; background: #04091a; padding: 16px; border-radius: 8px;">
              New Leave Request
            </h2>
            <p><strong>Employee:</strong> ${empName}</p>
            <p><strong>Leave Type:</strong> ${leaveType}</p>
            <p><strong>From:</strong> ${body.start_date}</p>
            <p><strong>To:</strong> ${body.end_date}</p>
            <p><strong>Duration:</strong> ${body.days_count} day(s)</p>
            ${body.reason ? `<p><strong>Reason:</strong> ${body.reason}</p>` : ''}
            <a href="${link}" style="display:inline-block; margin-top:16px; padding:10px 20px; background:#2563eb; color:white; border-radius:8px; text-decoration:none; font-weight:bold;">
              Review Request in LeadsMind
            </a>
            <p style="color:#94a3c8; font-size:12px; margin-top:24px;">
              Log in to LeadsMind to approve or reject this request.
            </p>
          </div>
        `,
      }).catch(() => {}) // Don't fail if email fails

    }

    return NextResponse.json({ success: true, leaveRequest: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.leave.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_LEAVE_APPROVAL_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json()
    delete body.workspace_id;

    // Fetch the leave request to get employee info
    const { data: existing } = await adminClient
      .from('leave_requests')
      .select('*, employees(first_name, last_name, email, annual_leave_used, sick_leave_used)')
      .eq("id", id).eq("workspace_id", workspaceId)
      .single()

    // Add actioned timestamp
    if (body.status === 'approved' || body.status === 'rejected') {
      body.actioned_at = new Date().toISOString()
    }

    const { data, error } = await adminClient
      .from('leave_requests')
      .update(body)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select('*, employees(first_name, last_name, email)')
      .single()

    if (error) throw error;

    const emp = data.employees
    const empName = `${emp?.first_name} ${emp?.last_name}`
    const leaveType = existing?.leave_type ?? 'leave'

    // If APPROVED — update employee leave balance
    if (body.status === 'approved' && existing) {
      if (existing.leave_type === 'annual') {
        await adminClient
          .from('employees')
          .update({
            annual_leave_used: (existing.employees?.annual_leave_used ?? 0) + existing.days_count
          })
          .eq("id", existing.employee_id).eq("workspace_id", workspaceId)
      } else if (existing.leave_type === 'sick') {
        await adminClient
          .from('employees')
          .update({
            sick_leave_used: (existing.employees?.sick_leave_used ?? 0) + existing.days_count
          })
          .eq("id", existing.employee_id).eq("workspace_id", workspaceId)
      }

      // Send approval email
      if (emp?.email) {
        await sendEmail({
          to: emp.email,
          subject: `Leave Request Approved — ${existing.days_count} day(s)`,
          html: `
            <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
              <h2 style="color: #10b981;">✓ Your Leave Request Has Been Approved</h2>
              <p>Hi ${emp.first_name},</p>
              <p>Your ${leaveType} leave request has been <strong>approved</strong>.</p>
              <p><strong>From:</strong> ${existing.start_date}</p>
              <p><strong>To:</strong> ${existing.end_date}</p>
              <p><strong>Duration:</strong> ${existing.days_count} day(s)</p>
              <p style="color:#94a3c8; font-size:12px; margin-top:24px;">
                This is an automated notification from LeadsMind HR.
              </p>
            </div>
          `,
        }).catch(() => {})
      }
    }

    // If REJECTED — send rejection email
    if (body.status === 'rejected' && existing && emp?.email) {
      await sendEmail({
        to: emp.email,
        subject: `Leave Request Not Approved`,
        html: `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #ef4444;">Leave Request Not Approved</h2>
            <p>Hi ${emp.first_name},</p>
            <p>Unfortunately your ${leaveType} leave request has been <strong>declined</strong>.</p>
            <p><strong>Requested dates:</strong> ${existing.start_date} to ${existing.end_date}</p>
            ${body.rejected_reason ? `<p><strong>Reason:</strong> ${body.rejected_reason}</p>` : ''}
            <p>Please speak to your manager if you have any questions.</p>
            <p style="color:#94a3c8; font-size:12px; margin-top:24px;">
              This is an automated notification from LeadsMind HR.
            </p>
          </div>
        `,
      }).catch(() => {})
    }

    return NextResponse.json({ success: true, leaveRequest: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.leave.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_LEAVE_APPROVAL_ROLES);
    const adminClient = createAdminClient();

    const { error } = await adminClient.from('leave_requests').delete().eq("id", id).eq("workspace_id", workspaceId)
    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'hr.leave.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
