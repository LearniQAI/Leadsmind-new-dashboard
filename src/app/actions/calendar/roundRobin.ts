'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Task 64 — the missing data-entry path for round-robin. The selection
// algorithm (scheduling.ts: getRoundRobinAssignee) has always been wired into
// every booking flow, but nothing ever wrote round_robin_assignment rows, so
// it could never actually run. These two actions back the "Manage team" UI on
// a round-robin booking calendar.
//
// Scope: round-robin is PER booking calendar (round_robin_assignment.calendar_id,
// UNIQUE(calendar_id, user_id)) — e.g. the "Sales Calls" page rotates between
// its 3 enrolled reps, independently of every other calendar.

async function verifyCalendar(supabase: any, calendarId: string, workspaceId: string) {
  const { data, error } = await supabase
    .from('booking_calendars')
    .select('id, name, calendar_type')
    .eq('id', calendarId)
    .eq('workspace_id', workspaceId)
    .single();
  if (error || !data) throw new Error('Calendar not found');
  return data;
}

export interface RoundRobinPoolMember {
  id: string;
  name: string;
  email: string | null;
  role: string;
  enrolled: boolean;
  bookingCount: number;
  lastAssignedAt: string | null;
}

interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Everyone in the workspace who can be a round-robin host, flagged with whether
 * they're currently enrolled in THIS calendar's pool + their running fairness
 * stats.
 */
export async function getRoundRobinPool(
  calendarId: string
): Promise<ActionResult<{ calendarName: string; members: RoundRobinPoolMember[] }>> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const calendar = await verifyCalendar(supabase, calendarId, workspaceId);

    const { data: memberRows } = await supabase
      .from('workspace_members')
      .select('user_id, role')
      .eq('workspace_id', workspaceId);

    const userIds = (memberRows || []).map((m: any) => m.user_id);
    const { data: users } = userIds.length
      ? await supabase.from('users').select('id, first_name, last_name, email').in('id', userIds)
      : { data: [] as any[] };
    const usersById = new Map((users || []).map((u: any) => [u.id, u]));

    const { data: assignments } = await supabase
      .from('round_robin_assignment')
      .select('user_id, booking_count, last_assigned_at')
      .eq('calendar_id', calendarId)
      .eq('workspace_id', workspaceId);
    const assignmentByUser = new Map((assignments || []).map((a: any) => [a.user_id, a]));

    const members: RoundRobinPoolMember[] = (memberRows || [])
      .filter((m: any) => usersById.has(m.user_id))
      // clients can't be meeting hosts
      .filter((m: any) => m.role !== 'client')
      .map((m: any) => {
        const u = usersById.get(m.user_id);
        const a = assignmentByUser.get(m.user_id);
        return {
          id: m.user_id,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email || 'Team member',
          email: u.email ?? null,
          role: m.role,
          enrolled: !!a,
          bookingCount: a?.booking_count ?? 0,
          lastAssignedAt: a?.last_assigned_at ?? null,
        };
      })
      .sort((x, y) => x.name.localeCompare(y.name));

    return { success: true, data: { calendarName: calendar.name, members } };
  } catch (err: any) {
    logger.error({ err, calendarId }, 'calendar.round_robin.get_pool.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * Replace this calendar's round-robin pool with exactly `userIds`. Existing
 * enrolled hosts that stay keep their booking_count / last_assigned_at (their
 * place in the rotation); hosts removed here keep any bookings already assigned
 * to them — only FUTURE assignments skip them.
 */
export async function setRoundRobinPool(calendarId: string, userIds: string[]): Promise<ActionResult<null>> {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    await verifyCalendar(supabase, calendarId, workspaceId);

    const requested = [...new Set(userIds)];

    // Never trust the client's ids — every one must be a real, non-client
    // member of THIS workspace.
    if (requested.length) {
      const { data: valid } = await supabase
        .from('workspace_members')
        .select('user_id')
        .eq('workspace_id', workspaceId)
        .in('user_id', requested)
        .neq('role', 'client');
      const validSet = new Set((valid || []).map((v: any) => v.user_id));
      if (requested.some((id) => !validSet.has(id))) {
        return { success: false, error: 'One or more selected users are not members of this workspace.' };
      }
    }

    const admin = createAdminClient();

    const { data: existing } = await admin
      .from('round_robin_assignment')
      .select('user_id')
      .eq('calendar_id', calendarId)
      .eq('workspace_id', workspaceId);
    const existingIds = new Set((existing || []).map((e: any) => e.user_id));

    const toAdd = requested.filter((id) => !existingIds.has(id));
    const toRemove = [...existingIds].filter((id) => !requested.includes(id));

    if (toRemove.length) {
      const { error } = await admin
        .from('round_robin_assignment')
        .delete()
        .eq('calendar_id', calendarId)
        .eq('workspace_id', workspaceId)
        .in('user_id', toRemove);
      if (error) throw error;
    }

    if (toAdd.length) {
      const { error } = await admin.from('round_robin_assignment').insert(
        toAdd.map((user_id) => ({
          workspace_id: workspaceId,
          calendar_id: calendarId,
          user_id,
          weight: 1,
          booking_count: 0,
          last_assigned_at: null,
        }))
      );
      if (error) throw error;
    }

    revalidatePath('/calendar');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, calendarId }, 'calendar.round_robin.set_pool.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}
