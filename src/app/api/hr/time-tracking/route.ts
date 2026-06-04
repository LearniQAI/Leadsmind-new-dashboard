import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser, getUserAccessInfo } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await getUserAccessInfo()

  const employeeId = req.nextUrl.searchParams.get('employeeId')
  const billableStr = req.nextUrl.searchParams.get('billable')

  let query = supabase
    .from('time_entries')
    .select('*, employees(first_name, last_name, email, avatar_url)')
    .eq('workspace_id', workspaceId)

  // Non-admin/non-HR/non-payroll can only see their own time entries
  if (!role || !['admin', 'owner', 'hr', 'payroll'].includes(role)) {
    const { data: emp } = await supabase
      .from('employees')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('email', user.email)
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ timeEntries: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role } = await getUserAccessInfo()
    const body = await req.json()

    // Non-admin/non-HR/non-payroll can only log time for themselves
    if (!role || !['admin', 'owner', 'hr', 'payroll'].includes(role)) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('workspace_id', body.workspace_id)
        .eq('email', user.email)
        .maybeSingle()

      if (!emp || body.employee_id !== emp.id) {
        return NextResponse.json({ error: 'Unauthorized to log time for another employee' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('time_entries')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, timeEntry: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role } = await getUserAccessInfo()
    const body = await req.json()

    // Fetch existing
    const { data: existing } = await supabase
      .from('time_entries')
      .select('employee_id, workspace_id')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    // Non-admin/non-HR/non-payroll can only update their own time entries
    if (!role || !['admin', 'owner', 'hr', 'payroll'].includes(role)) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('workspace_id', existing.workspace_id)
        .eq('email', user.email)
        .maybeSingle()

      if (!emp || existing.employee_id !== emp.id || body.employee_id !== emp.id) {
        return NextResponse.json({ error: 'Unauthorized to modify another employee\'s time entry' }, { status: 403 })
      }
    }

    const { data, error } = await supabase
      .from('time_entries')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, timeEntry: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const user = await getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { role } = await getUserAccessInfo()

    // Fetch existing
    const { data: existing } = await supabase
      .from('time_entries')
      .select('employee_id, workspace_id')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })

    // Non-admin/non-HR/non-payroll can only delete their own time entries
    if (!role || !['admin', 'owner', 'hr', 'payroll'].includes(role)) {
      const { data: emp } = await supabase
        .from('employees')
        .select('id')
        .eq('workspace_id', existing.workspace_id)
        .eq('email', user.email)
        .maybeSingle()

      if (!emp || existing.employee_id !== emp.id) {
        return NextResponse.json({ error: 'Unauthorized to delete another employee\'s time entry' }, { status: 403 })
      }
    }

    const { error } = await supabase.from('time_entries').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
