import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { getUser, getUserAccessInfo } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper: get all admin/owner user emails for a workspace
async function getWorkspaceAdminEmails(workspaceId: string): Promise<{id: string, email: string}[]> {
  // Get workspace owner
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('owner_id')
    .eq('id', workspaceId)
    .single()

  // Get all admin members
  const { data: adminMembers } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin')

  const userIds = new Set<string>()
  if (workspace?.owner_id) userIds.add(workspace.owner_id)
  adminMembers?.forEach(m => userIds.add(m.user_id))

  if (userIds.size === 0) return []

  // Get emails from auth.users via supabase admin
  const { data: users } = await supabase.auth.admin.listUsers()
  return (users?.users ?? [])
    .filter(u => userIds.has(u.id))
    .map(u => ({ id: u.id, email: u.email ?? '' }))
    .filter(u => u.email)
}

// Helper: create in-app notification
async function createNotification(
  workspaceId: string,
  userId: string,
  title: string,
  message: string,
  link: string
) {
  await supabase.from('notifications').insert({
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
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await getUserAccessInfo()

  const employeeId = req.nextUrl.searchParams.get('employeeId')
  let query = supabase
    .from('leave_requests')
    .select('*, employees(first_name, last_name, email, avatar_url, annual_leave_balance, annual_leave_used, sick_leave_balance, sick_leave_used)')
    .eq('workspace_id', workspaceId)

  // Non-HR/non-admin users can only view their own leave requests
  if (!role || !['admin', 'owner', 'hr'].includes(role)) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', user.email)
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leaveRequests: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role } = await getUserAccessInfo()
    const body = await req.json()

    // Non-HR/non-admin users can only request leaves for themselves
    if (!role || !['admin', 'owner', 'hr'].includes(role)) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('workspace_id', body.workspace_id)
        .eq('email', user.email)
        .maybeSingle()

      if (!emp || body.employee_id !== emp.id) {
        return NextResponse.json({ error: 'Unauthorized to request leave for another employee' }, { status: 403 })
      }
    }

    // Validate employee exists and has enough leave balance
    if (body.leave_type === 'annual' || body.leave_type === 'sick') {
      const { data: employee } = await supabase
        .from('employees')
        .select('first_name, last_name, email, annual_leave_balance, annual_leave_used, sick_leave_balance, sick_leave_used')
        .eq('id', body.employee_id)
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

    const { data, error } = await supabase
      .from('leave_requests')
      .insert(body)
      .select('*, employees(first_name, last_name, email)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const emp = data.employees
    const empName = `${emp?.first_name} ${emp?.last_name}`
    const leaveType = body.leave_type.charAt(0).toUpperCase() + body.leave_type.slice(1)
    const link = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://leadsmind.io'}/hr/leave`

    // Notify all workspace admins — in-app notification
    const admins = await getWorkspaceAdminEmails(body.workspace_id)
    for (const admin of admins) {
      // In-app bell notification
      await createNotification(
        body.workspace_id,
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { role } = await getUserAccessInfo()
    if (!role || !['admin', 'owner', 'hr'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized: Only admins and HR can approve or reject leaves' }, { status: 403 })
    }

    const body = await req.json()

    // Fetch the leave request to get employee info
    const { data: existing } = await supabase
      .from('leave_requests')
      .select('*, employees(first_name, last_name, email, annual_leave_used, sick_leave_used)')
      .eq('id', id)
      .single()

    // Add actioned timestamp
    if (body.status === 'approved' || body.status === 'rejected') {
      body.actioned_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('leave_requests')
      .update(body)
      .eq('id', id)
      .select('*, employees(first_name, last_name, email)')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const emp = data.employees
    const empName = `${emp?.first_name} ${emp?.last_name}`
    const leaveType = existing?.leave_type ?? 'leave'

    // If APPROVED — update employee leave balance
    if (body.status === 'approved' && existing) {
      if (existing.leave_type === 'annual') {
        await supabase
          .from('employees')
          .update({
            annual_leave_used: (existing.employees?.annual_leave_used ?? 0) + existing.days_count
          })
          .eq('id', existing.employee_id)
      } else if (existing.leave_type === 'sick') {
        await supabase
          .from('employees')
          .update({
            sick_leave_used: (existing.employees?.sick_leave_used ?? 0) + existing.days_count
          })
          .eq('id', existing.employee_id)
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const { role } = await getUserAccessInfo()
    if (!role || !['admin', 'owner', 'hr'].includes(role)) {
      return NextResponse.json({ error: 'Unauthorized: Only admins and HR can delete leave records' }, { status: 403 })
    }

    const { error } = await supabase.from('leave_requests').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
