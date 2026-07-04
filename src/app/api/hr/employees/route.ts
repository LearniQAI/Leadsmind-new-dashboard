import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUser, getUserAccessInfo } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Standardize employee roles that can write/manage team members
const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'];

export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { role } = await getUserAccessInfo()

  // Auto-sync workspace members into the employees table
  try {
    const { data: members } = await supabase
      .from('workspace_members')
      .select(`
        role,
        user_id,
        user:users (
          email,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq('workspace_id', workspaceId)

    const { data: existingEmployees } = await supabase
      .from('employees')
      .select('email')
      .eq('workspace_id', workspaceId)

    const employeeEmails = new Set(existingEmployees?.map(e => e.email?.toLowerCase()) ?? [])
    const toInsert = []

    for (const member of (members ?? [])) {
      const u = member.user as any
      const userObj = Array.isArray(u) ? u[0] : u
      const email = userObj?.email
      if (email && !employeeEmails.has(email.toLowerCase())) {
        toInsert.push({
          workspace_id: workspaceId,
          first_name: userObj?.first_name || 'Member',
          last_name: userObj?.last_name || '',
          email: email,
          role: member.role || 'Member',
          avatar_url: userObj?.avatar_url || null,
          status: 'active',
          employment_type: 'full_time'
        })
      }
    }

    if (toInsert.length > 0) {
      await supabase.from('employees').insert(toInsert)
    }
  } catch (syncError) {
    console.error('[employees-sync-error]:', syncError)
  }

  let query = supabase
    .from('employees')
    .select('*')
    .eq('workspace_id', workspaceId)

  // Non-HR/non-admin users can only see their own employee record matching their email
  if (!role || !['admin', 'owner', 'hr', 'payroll'].includes(role)) {
    query = query.eq('email', user.email)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ employees: data ?? [] })
}

export async function POST(req: NextRequest) {
  try {
    const { role } = await getUserAccessInfo()
    if (!role || !ALLOWED_HR_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Unauthorized: Only admins and HR can register employees' }, { status: 403 })
    }

    const body = await req.json()
    const { data, error } = await supabase
      .from('employees')
      .insert(body)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, employee: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  try {
    const { role } = await getUserAccessInfo()
    if (!role || !ALLOWED_HR_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Unauthorized: Only admins and HR can update employees' }, { status: 403 })
    }

    const body = await req.json()
    body.updated_at = new Date().toISOString()
    const { data, error } = await supabase
      .from('employees')
      .update(body)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, employee: data })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })

  try {
    const { role } = await getUserAccessInfo()
    if (!role || !ALLOWED_HR_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Unauthorized: Only admins and HR can delete employees' }, { status: 403 })
    }

    const { error } = await supabase.from('employees').delete().eq("id", id).eq("workspace_id", workspaceId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

