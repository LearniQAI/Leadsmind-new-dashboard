import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const PRIVILEGED_ROLES = ['admin', 'owner', 'hr', 'payroll'];

export async function GET(req: NextRequest) {
  try {
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const employeeId = req.nextUrl.searchParams.get('employeeId')
    const billableStr = req.nextUrl.searchParams.get('billable')

    let query = adminClient
      .from('time_entries')
      .select('*, employees(first_name, last_name, email, avatar_url)')
      .eq('workspace_id', workspaceId)

    // Non-admin/non-HR/non-payroll can only see their own time entries
    if (!PRIVILEGED_ROLES.includes(role)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp) {
        return NextResponse.json({ timeEntries: [] })
      }
      query = query.eq('employee_id', emp.id)
    } else {
      if (employeeId && employeeId !== 'all') {
        query = query.eq('employee_id', employeeId)
      }
    }

    if (billableStr === 'true') {
      query = query.eq('billable', true)
    } else if (billableStr === 'false') {
      query = query.eq('billable', false)
    }

    const { data, error } = await query.order('date', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ timeEntries: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.time_tracking.get.failed');
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

    // Non-admin/non-HR/non-payroll can only log time for themselves
    if (!PRIVILEGED_ROLES.includes(role)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp || body.employee_id !== emp.id) {
        throw new ForbiddenError('Unauthorized to log time for another employee');
      }
    }

    const { data, error } = await adminClient
      .from('time_entries')
      .insert({ ...body, workspace_id: workspaceId })
      .select()
      .single()

    if (error) throw error;
    return NextResponse.json({ success: true, timeEntry: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.time_tracking.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    // Fetch existing — scoped to the caller's real workspace, not just any id
    const { data: existing } = await adminClient
      .from('time_entries')
      .select('employee_id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existing) throw new NotFoundError('Time entry');

    const body = await req.json()
    delete body.workspace_id;

    // Non-admin/non-HR/non-payroll can only update their own time entries
    if (!PRIVILEGED_ROLES.includes(role)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp || existing.employee_id !== emp.id || body.employee_id !== emp.id) {
        throw new ForbiddenError('Unauthorized to modify another employee\'s time entry');
      }
    }

    const { data, error } = await adminClient
      .from('time_entries')
      .update(body)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single()

    if (error) throw error;
    return NextResponse.json({ success: true, timeEntry: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.time_tracking.patch.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    // Fetch existing — scoped to the caller's real workspace, not just any id
    const { data: existing } = await adminClient
      .from('time_entries')
      .select('employee_id, workspace_id')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single()

    if (!existing) throw new NotFoundError('Time entry');

    // Non-admin/non-HR/non-payroll can only delete their own time entries
    if (!PRIVILEGED_ROLES.includes(role)) {
      const { data: emp } = await adminClient
        .from('employees')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('email', userEmail)
        .maybeSingle()

      if (!emp || existing.employee_id !== emp.id) {
        throw new ForbiddenError('Unauthorized to delete another employee\'s time entry');
      }
    }

    const { error } = await adminClient.from('time_entries').delete().eq('id', id).eq('workspace_id', workspaceId)
    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'hr.time_tracking.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
