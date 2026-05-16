'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
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
    console.error('[CalendarCoreAction Error]:', err.message);
    return { success: false, error: err.message || 'Operation failed' };
  }
}

export async function getCalendars() {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('booking_calendars')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  });
}

export async function createCalendar(payload: {
  name: string;
  slug: string;
  calendarType: 'personal' | 'round_robin' | 'collective' | 'class_booking' | 'service_menu' | 'event';
  meetingMode: 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom_link' | 'client_choice';
  description?: string;
  timezone?: string;
  slotDuration?: number;
  bufferTime?: number;
  capacity?: number;
  price?: number;
  waitlistEnabled?: boolean;
}) {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('booking_calendars')
      .insert({
        workspace_id: workspaceId,
        name: payload.name,
        slug: payload.slug,
        calendar_type: payload.calendarType,
        meeting_mode: payload.meetingMode,
        description: payload.description,
        timezone: payload.timezone || 'UTC',
        slot_duration: payload.slotDuration || 30,
        buffer_time: payload.bufferTime || 0,
        capacity: payload.capacity || 1,
        price: payload.price || 0,
        waitlist_enabled: payload.waitlistEnabled || false
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/calendar');
    return data;
  });
}

export async function updateCalendar(id: string, payload: Partial<any>) {
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

/**
 * Public lookup for booking pages
 */
export async function getPublicCalendarBySlug(slug: string) {
    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('booking_calendars')
        .select(`
          *,
          workspace:workspaces(name, slug, logo_url)
        `)
        .eq('slug', slug)
        .single();

    if (error) {
        console.error('[getPublicCalendarBySlug Error]:', error.message);
        return null;
    }
    return data;
}
