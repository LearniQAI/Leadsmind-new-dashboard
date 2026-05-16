'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };
    
    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId);
    return { success: true, data };
  } catch (err: any) {
    console.error('[CalendarEngineAction Error]:', err.message);
    return { success: false, error: err.message || 'Operation failed' };
  }
}

export async function createCalendar(payload: any) {
  return executeAction(async (supabase, workspaceId) => {
    // Generate slug from name
    const slug = payload.name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    
    const { data, error } = await supabase
      .from('booking_calendars')
      .insert({
        ...payload,
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
    const { data, error } = await supabase
      .from('booking_calendars')
      .update({
        ...payload,
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
