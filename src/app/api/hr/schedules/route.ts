import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Schedules are an admin/owner/hr-managed policy layer (shift definitions assigned to
// employees) — same role set as employee management, distinct from payroll's extra
// 'payroll' role since schedules aren't financial data.
const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;

const ALLOWED_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function validateScheduleBody(body: any): string | null {
  if (!body.name || typeof body.name !== 'string') return 'name is required'
  if (body.days_of_week && (!Array.isArray(body.days_of_week) || body.days_of_week.some((d: any) => !ALLOWED_DAYS.includes(d)))) {
    return 'days_of_week must be an array of mon..sun'
  }
  return null
}

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('schedules')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ schedules: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.schedules.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json()
    const validationError = validateScheduleBody(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

    delete body.workspace_id;
    delete body.id;

    const { data, error } = await adminClient
      .from('schedules')
      .insert({ ...body, workspace_id: workspaceId })
      .select()
      .single()

    if (error) throw error;
    return NextResponse.json({ success: true, schedule: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.schedules.post.failed');
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
    if ('days_of_week' in body) {
      const validationError = validateScheduleBody({ name: body.name ?? 'x', days_of_week: body.days_of_week });
      if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })
    }

    delete body.workspace_id;
    delete body.id;
    body.updated_at = new Date().toISOString()

    const { data, error } = await adminClient
      .from('schedules')
      .update(body)
      .eq('id', id).eq('workspace_id', workspaceId)
      .select()
      .maybeSingle()

    if (error) throw error;
    if (!data) throw new NotFoundError('Schedule');
    return NextResponse.json({ success: true, schedule: data })
  } catch (err: any) {
    logger.error({ err }, 'hr.schedules.patch.failed');
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

    // Deliberate choice (not the FK default): a schedule with active employee
    // assignments cannot be deleted (ON DELETE RESTRICT, per the hardening
    // migration) — silently nulling out every affected employee's schedule_id
    // was the accidental original behavior, not something anyone decided was
    // safe. Check first so the error names how many employees are affected,
    // instead of surfacing a raw Postgres FK-violation message.
    const { count: assignedCount, error: countErr } = await adminClient
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('schedule_id', id)
      .eq('workspace_id', workspaceId)

    if (countErr) throw countErr;
    if (assignedCount && assignedCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete this schedule: ${assignedCount} employee(s) are still assigned to it. Reassign them first.` },
        { status: 409 }
      )
    }

    const { data, error } = await adminClient
      .from('schedules')
      .delete()
      .eq('id', id).eq('workspace_id', workspaceId)
      .select('id')

    if (error) throw error;
    if (!data || data.length === 0) throw new NotFoundError('Schedule');
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'hr.schedules.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
