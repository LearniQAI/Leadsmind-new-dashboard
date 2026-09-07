import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Terminations touch the same sensitive HR territory as payroll — read access is
// restricted to admin/owner/hr, unlike warnings/leave/time-tracking which let an
// employee see their own record. There is no "terminate yourself" self-service case.
const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;

// GET-only: creation happens exclusively via POST /api/hr/employees/[id]/terminate.
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const employeeId = req.nextUrl.searchParams.get('employeeId')
    let query = adminClient
      .from('terminations')
      .select('*, employees(first_name, last_name, email, avatar_url)')
      .eq('workspace_id', workspaceId)

    if (employeeId) query = query.eq('employee_id', employeeId)

    const { data, error } = await query.order('termination_date', { ascending: false })
    if (error) throw error;
    return NextResponse.json({ terminations: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.terminations.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
