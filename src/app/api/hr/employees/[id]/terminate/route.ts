import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { NotFoundError, ConflictError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;

/**
 * POST /api/hr/employees/[id]/terminate
 *
 * The single, dedicated place an employee is actually terminated. This is deliberately
 * NOT part of the generic `PATCH /api/hr/employees` field-update path — termination is a
 * real business event (a record of why/when/who processed it), not just a status flip.
 *
 * The terminations INSERT and the employees.status UPDATE run as a single atomic RPC
 * (`terminate_employee_atomic`, supabase/migrations/20260907130000_hr_termination_hardening.sql)
 * — a real Postgres transaction with a row lock, not two sequential app-level calls. That
 * closes both a partial-write risk (insert succeeds, status update fails, or vice versa)
 * and a TOCTOU race where two concurrent terminate calls for the same employee could both
 * pass an "already terminated?" pre-check and both insert a termination row.
 *
 * This route is the intended call site for Task 49's HR notifications: once a
 * termination is recorded here, call `sendHRNotification(employeeId, 'termination')`
 * (src/app/actions/hr/notifications.ts) right after the RPC call below succeeds.
 *
 * Body: { terminationDate?: string, lastWorkingDay?: string, reason: string,
 *         rehireEligible?: boolean, notes?: string }
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json().catch(() => ({}))
    const { terminationDate, lastWorkingDay, reason, rehireEligible, notes } = body

    if (!reason || typeof reason !== 'string') {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 })
    }

    const { data: rpcResult, error: rpcError } = await adminClient
      .rpc('terminate_employee_atomic', {
        p_workspace_id: workspaceId,
        p_employee_id: employeeId,
        p_termination_date: terminationDate || null,
        p_last_working_day: lastWorkingDay || null,
        p_reason: reason,
        p_rehire_eligible: rehireEligible ?? true,
        p_notes: notes || null,
        p_processed_by: userId,
      })
      .single() as { data: { termination_id: string; employee_status: string } | null; error: any }

    if (rpcError) {
      if (rpcError.message?.includes('not found')) throw new NotFoundError('Employee');
      if (rpcError.message?.includes('already terminated')) throw new ConflictError('This employee is already terminated');
      throw rpcError;
    }

    // Fetch the real rows to return the same shape the previous two-call version did.
    const [{ data: termination }, { data: updatedEmployee }] = await Promise.all([
      adminClient.from('terminations').select('*').eq('id', rpcResult!.termination_id).single(),
      adminClient.from('employees').select('*').eq('id', employeeId).eq('workspace_id', workspaceId).single(),
    ])

    // Task 49 hook point: sendHRNotification(employeeId, 'termination') goes here once built.

    return NextResponse.json({ success: true, termination, employee: updatedEmployee })
  } catch (err: any) {
    logger.error({ err }, 'hr.employees.terminate.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
