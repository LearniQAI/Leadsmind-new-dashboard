'use server';

// Working-hours availability — previously had a real schema
// (host_availability_profiles, meet_date_overrides) and was genuinely
// consulted by getAvailableSlots(), but had ZERO write path anywhere in the
// app, so every workspace silently ran on the hardcoded Mon-Fri 9-5 fallback
// forever. This file is the missing write path.
//
// Rows are keyed by the WORKSPACE OWNER's user_id, not the signed-in caller —
// booking_calendars has no per-calendar owner column, so scheduling.ts's
// resolveHostUserId() falls back to the workspace owner for every calendar
// that isn't round-robin (see that function's comment). One workspace-wide
// availability profile is what actually gets picked up today; a per-member
// profile only ever applies to a round-robin calendar that member is
// enrolled in, and there's no UI surface for that distinction yet — out of
// scope here, kept lean per the ask.

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

export interface DaySlot {
  start: string; // "HH:MM"
  end: string;
}

export interface WeeklyDay {
  day_of_week: number; // 0 (Sun) - 6 (Sat)
  enabled: boolean;
  slots: DaySlot[];
}

async function executeAction<T>(action: (supabase: any, ownerId: string, workspaceId: string) => Promise<T>) {
  try {
    // Lazy import — see resources.ts for why (`@/lib/auth` calls React's
    // cache() at module load, which breaks outside the Next.js RSC runtime).
    const { requireWorkspaceAccess } = await import('@/lib/auth');
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: workspace, error: wsErr } = await supabase
      .from('workspaces')
      .select('owner_id')
      .eq('id', workspaceId)
      .single();
    if (wsErr || !workspace?.owner_id) throw new Error('Could not resolve workspace owner');

    const data = await action(supabase, workspace.owner_id, workspaceId);
    return { success: true as const, data };
  } catch (err: any) {
    logger.error({ err }, 'calendar.availability_action.failed');
    const clientError = toClientError(err);
    return { success: false as const, error: clientError.error };
  }
}

const DEFAULT_WEEK: WeeklyDay[] = [
  { day_of_week: 0, enabled: false, slots: [] },
  { day_of_week: 1, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day_of_week: 2, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day_of_week: 3, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day_of_week: 4, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day_of_week: 5, enabled: true, slots: [{ start: '09:00', end: '17:00' }] },
  { day_of_week: 6, enabled: false, slots: [] },
];

export async function getAvailabilitySettings() {
  return executeAction(async (supabase, ownerId) => {
    const { data: profileRows } = await supabase
      .from('host_availability_profiles')
      .select('day_of_week, enabled, slots, buffer_time, minimum_notice_period, maximum_days_in_advance')
      .eq('user_id', ownerId)
      .order('day_of_week', { ascending: true });

    const week: WeeklyDay[] = DEFAULT_WEEK.map((d) => {
      const row = profileRows?.find((r: any) => r.day_of_week === d.day_of_week);
      return row ? { day_of_week: row.day_of_week, enabled: row.enabled, slots: row.slots || [] } : d;
    });

    const anyRow = profileRows?.[0];
    const bufferTime = anyRow?.buffer_time ?? 15;
    const minimumNoticePeriod = anyRow?.minimum_notice_period ?? 120;
    const maximumDaysInAdvance = anyRow?.maximum_days_in_advance ?? 30;

    const { data: overrides } = await supabase
      .from('meet_date_overrides')
      .select('id, override_date, enabled, slots, reason')
      .eq('user_id', ownerId)
      .gte('override_date', new Date().toISOString().split('T')[0])
      .order('override_date', { ascending: true });

    return {
      week,
      bufferTime,
      minimumNoticePeriod,
      maximumDaysInAdvance,
      overrides: overrides || [],
      isDefault: !profileRows || profileRows.length === 0,
    };
  });
}

export async function saveWeeklyAvailability(params: {
  week: WeeklyDay[];
  bufferTime: number;
  minimumNoticePeriod: number;
  maximumDaysInAdvance: number;
}) {
  return executeAction(async (supabase, ownerId, workspaceId) => {
    const rows = params.week.map((d) => ({
      workspace_id: workspaceId,
      user_id: ownerId,
      day_of_week: d.day_of_week,
      enabled: d.enabled,
      slots: d.enabled ? d.slots : [],
      buffer_time: Math.max(0, Math.floor(params.bufferTime)),
      minimum_notice_period: Math.max(0, Math.floor(params.minimumNoticePeriod)),
      maximum_days_in_advance: Math.max(1, Math.floor(params.maximumDaysInAdvance)),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('host_availability_profiles')
      .upsert(rows, { onConflict: 'user_id,day_of_week' });
    if (error) throw error;

    revalidatePath('/calendar/availability');
    return true;
  });
}

export async function saveDateOverride(params: {
  date: string; // YYYY-MM-DD
  enabled: boolean; // false = fully blocked
  slots?: DaySlot[];
  reason?: string;
}) {
  return executeAction(async (supabase, ownerId, workspaceId) => {
    const { error } = await supabase
      .from('meet_date_overrides')
      .upsert(
        {
          workspace_id: workspaceId,
          user_id: ownerId,
          override_date: params.date,
          enabled: params.enabled,
          slots: params.enabled ? params.slots || [] : [],
          reason: params.reason || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,override_date' }
      );
    if (error) throw error;

    revalidatePath('/calendar/availability');
    return true;
  });
}

export async function deleteDateOverride(id: string) {
  return executeAction(async (supabase, ownerId) => {
    const { error } = await supabase
      .from('meet_date_overrides')
      .delete()
      .eq('id', id)
      .eq('user_id', ownerId);
    if (error) throw error;

    revalidatePath('/calendar/availability');
    return true;
  });
}
