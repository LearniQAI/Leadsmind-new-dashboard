import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Standardize employee roles that can write/manage team members
const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;
const PRIVILEGED_VIEW_ROLES = ['admin', 'owner', 'hr', 'payroll'];

export async function GET(req: NextRequest) {
  try {
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    // Auto-sync workspace members into the employees table
    try {
      const { data: members } = await adminClient
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

      const { data: existingEmployees } = await adminClient
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
        await adminClient.from('employees').insert(toInsert)
      }
    } catch (syncError) {
      logger.error({ err: syncError }, 'hr.employees.sync.failed');
    }

    let query = adminClient
      .from('employees')
      .select('*')
      .eq('workspace_id', workspaceId)

    // Non-HR/non-admin/non-payroll users can only see their own employee record
    if (!PRIVILEGED_VIEW_ROLES.includes(role)) {
      query = query.eq('email', userEmail)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ employees: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.employees.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json()
    delete body.workspace_id;

    const { data, error } = await adminClient
      .from('employees')
      .insert({ ...body, workspace_id: workspaceId })
      .select()
      .single()

    if (error) throw error;
    return NextResponse.json({ success: true, employee: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.employees.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const { workspaceId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json()
    delete body.workspace_id;
    body.updated_at = new Date().toISOString()

    const { data, error } = await adminClient
      .from('employees')
      .update(body)
      .eq("id", id).eq("workspace_id", workspaceId)
      .select()
      .single()

    if (error) throw error;
    return NextResponse.json({ success: true, employee: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.employees.patch.failed');
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

    const { error } = await adminClient.from('employees').delete().eq("id", id).eq("workspace_id", workspaceId)
    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'hr.employees.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
