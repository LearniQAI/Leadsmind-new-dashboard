'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

// Consolidated onto this file per the Priority 2 booking_calendars CRUD
// cleanup — calendar/core.ts and calendar.ts each had their own dead/drifted
// copies of this same CRUD, one of which (calendar.ts) at least called
// requireAuth(); this is the live path (wired to CalendarPagesView.tsx), now
// carrying both fixes: real membership verification and a field allow-list.
async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();

    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId);
    return { success: true, data };
  } catch (err: any) {
    logger.error({ err }, 'calendar.engine_action.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

// Matches exactly what CalendarSettingsModal.tsx's form actually sends
// (verified against its zod schema) — never spread the raw client payload
// directly into the insert/update.
const EDITABLE_CALENDAR_FIELDS = ['name', 'calendar_type', 'meeting_mode', 'location', 'description', 'price'] as const;

function pickEditableFields(payload: any): Record<string, any> {
  const picked: Record<string, any> = {};
  for (const field of EDITABLE_CALENDAR_FIELDS) {
    if (payload[field] !== undefined) picked[field] = payload[field];
  }
  return picked;
}

export async function createCalendar(payload: any) {
  return executeAction(async (supabase, workspaceId) => {
    const fields = pickEditableFields(payload);
    if (!fields.name) throw new Error('Calendar name is required');

    // Generate slug from name
    const slug = fields.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');

    const { data, error } = await supabase
      .from('booking_calendars')
      .insert({
        ...fields,
        workspace_id: workspaceId,
        slug,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/calendar');
    return data;
  });
}

export async function updateCalendar(id: string, payload: any) {
  return executeAction(async (supabase, workspaceId) => {
    const fields = pickEditableFields(payload);

    const { data, error } = await supabase
      .from('booking_calendars')
      .update({
        ...fields,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/calendar');
    return data;
  });
}

export async function deleteCalendar(id: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('booking_calendars')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    revalidatePath('/calendar');
    return true;
  });
}
