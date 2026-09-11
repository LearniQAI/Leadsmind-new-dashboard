'use server';

// Task 71 — workspace resource booking (meeting rooms, desks, equipment).
// See docs/calendar-task71-resource-booking.md for the Step 1 scope decision.
//
// Resources are workspace-wide bookable inventory. The actual double-booking
// guarantee lives in the DB (`appointments_resource_no_overlap`, migration
// 20260911120000) — this file only owns CRUD on the `resources` table itself.
// Same auth/workspace-scoping pattern as appointments.ts.

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

export type ResourceType = 'room' | 'desk' | 'equipment';

async function executeAction<T>(action: (supabase: any, workspaceId: string, userId: string) => Promise<T>) {
  try {
    // Lazy import — `@/lib/auth` calls React's `cache()` at module load, which
    // breaks when this file is required outside the Next.js RSC runtime (e.g.
    // a tsx verification script importing computeResourceAvailability below).
    // Only executeAction (a real authenticated request) needs it.
    const { requireWorkspaceAccess } = await import('@/lib/auth');
    const { workspaceId, userId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId, userId);
    return { success: true as const, data };
  } catch (err: any) {
    logger.error({ err }, 'calendar.resources_action.failed');
    const clientError = toClientError(err);
    return { success: false as const, error: clientError.error };
  }
}

export async function listResources(includeInactive = false) {
  return executeAction(async (supabase, workspaceId) => {
    let query = supabase
      .from('resources')
      .select('id, name, type, location, capacity, notes, is_active, created_at')
      .eq('workspace_id', workspaceId)
      .order('type', { ascending: true })
      .order('name', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  });
}

export async function createResource(payload: {
  name: string;
  type: ResourceType;
  location?: string | null;
  capacity?: number | null;
  notes?: string | null;
}) {
  return executeAction(async (supabase, workspaceId, userId) => {
    if (!payload.name?.trim()) throw new Error('Name is required');
    const { data, error } = await supabase
      .from('resources')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        type: payload.type,
        location: payload.location?.trim() || null,
        capacity: payload.capacity ?? null,
        notes: payload.notes?.trim() || null,
        created_by: userId,
      })
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/calendar');
    return data;
  });
}

export async function updateResource(
  id: string,
  payload: Partial<{ name: string; type: ResourceType; location: string | null; capacity: number | null; notes: string | null; is_active: boolean }>
) {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('resources')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (error) throw error;
    revalidatePath('/calendar');
    return data;
  });
}

/**
 * Soft-delete only (is_active = false) — never a hard DELETE. A resource with
 * past/future reservations must keep existing for those appointments'
 * history; the workspace-facing effect a user wants ("stop offering this
 * room") is exactly what is_active already does everywhere it's read
 * (createAppointment / BookingModal only list active resources).
 */
export async function deactivateResource(id: string) {
  return updateResource(id, { is_active: false });
}

export async function reactivateResource(id: string) {
  return updateResource(id, { is_active: true });
}

/**
 * Real-availability check for one resource over an exact time range — used by
 * the booking UI to grey out (not just error-after-submit) a resource that's
 * already reserved for the selected slot. Mirrors the same overlap logic the
 * DB constraint enforces (belt-and-braces: this is a courtesy for fast UI
 * feedback, the EXCLUDE constraint is the actual source of truth).
 *
 * Split into a plain, exported core (`computeResourceAvailability`) + the
 * `requireWorkspaceAccess()`-gated action that calls it, so this exact query
 * logic — not a hand-reimplemented copy — can be exercised directly against
 * the live DB from a verification script (which has no real session/cookie
 * context to satisfy the auth gate) using the admin client. The auth gate
 * itself is untouched; only the query logic underneath it is shared.
 */
export async function computeResourceAvailability(
  supabase: any,
  workspaceId: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
) {
  const { data: resources, error: resErr } = await supabase
    .from('resources')
    .select('id, name, type, location, capacity')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)
    .order('type', { ascending: true })
    .order('name', { ascending: true });
  if (resErr) throw resErr;
  if (!resources || resources.length === 0) return [];

  let bookedQuery = supabase
    .from('appointments')
    .select('resource_id')
    .eq('workspace_id', workspaceId)
    .eq('status', 'scheduled')
    .not('resource_id', 'is', null)
    .lt('start_time', endTime)
    .gt('end_time', startTime);
  if (excludeAppointmentId) bookedQuery = bookedQuery.neq('id', excludeAppointmentId);
  const { data: booked, error: bookedErr } = await bookedQuery;
  if (bookedErr) throw bookedErr;

  const bookedIds = new Set((booked ?? []).map((b: any) => b.resource_id));
  return resources.map((r: any) => ({ ...r, available: !bookedIds.has(r.id) }));
}

export async function getResourceAvailability(startTime: string, endTime: string, excludeAppointmentId?: string) {
  return executeAction(async (supabase, workspaceId) =>
    computeResourceAvailability(supabase, workspaceId, startTime, endTime, excludeAppointmentId)
  );
}
