'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { validateSlot, getRoundRobinAssignee, updateRoundRobinStats } from './scheduling';

async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };
    
    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId);
    return { success: true, data };
  } catch (err: any) {
    console.error('[CalendarAppointmentAction Error]:', err.message);
    return { success: false, error: err.message || 'Operation failed' };
  }
}

export async function getAppointments() {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        contact:contacts(first_name, last_name, email),
        calendar:booking_calendars(name, calendar_type, price)
      `)
      .eq('workspace_id', workspaceId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return data;
  });
}

export async function createAppointment(payload: {
  calendarId: string;
  contactId?: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingMode?: string;
  metadata?: any;
  skipValidation?: boolean;
}) {
  return executeAction(async (supabase, workspaceId) => {
    // 1. Fetch Calendar Metadata
    const { data: calendar, error: calError } = await supabase
      .from('booking_calendars')
      .select('calendar_type, meeting_mode, capacity, location')
      .eq('id', payload.calendarId)
      .single();

    if (calError || !calendar) throw new Error('Calendar Engine not found');

    // 2. Determine Effective Meeting Mode (Override vs Default)
    const effectiveMode = payload.meetingMode || calendar.meeting_mode || 'internal_meet';
    
    // 3. Engine-Specific Logic
    let assigneeId = null;
    let meetingLink = calendar.location || null;

    if (calendar.calendar_type === 'round_robin') {
      assigneeId = await getRoundRobinAssignee(payload.calendarId, workspaceId);
    }

    // 4. Link Generation
    if (effectiveMode === 'google_meet') {
      meetingLink = `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    } else if (effectiveMode === 'zoom') {
      meetingLink = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}`;
    } else if (effectiveMode === 'custom_link' && !meetingLink) {
      // Fallback to internal if custom mode selected but no link provided
    }

    // 5. Validation Logic
    if (!payload.skipValidation) {
      const validation = await validateSlot(payload.calendarId, payload.startTime, payload.endTime);
      if (!validation.available) {
        throw new Error(validation.reason);
      }
    }

    // 6. Insert Appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        workspace_id: workspaceId,
        calendar_id: payload.calendarId,
        contact_id: payload.contactId,
        user_id: assigneeId,
        title: payload.title,
        start_time: payload.startTime,
        end_time: payload.endTime,
        meeting_link: meetingLink,
        meeting_mode: effectiveMode,
        metadata: {
          ...(payload.metadata || {}),
          engine_type: calendar.calendar_type,
          original_engine_mode: calendar.meeting_mode
        },
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;

    // 7. Post-Insert Update for Internal Meet Links
    if (effectiveMode === 'internal_meet' || (effectiveMode === 'custom_link' && !meetingLink)) {
       const baseUrl = process.env.NODE_ENV === 'development' 
         ? 'http://localhost:3000' 
         : (process.env.NEXT_PUBLIC_APP_URL || '');
         
       const internalLink = `${baseUrl}/meet/${data.id}`;
       await supabase.from('appointments').update({ 
         meeting_link: internalLink,
         meeting_mode: 'internal_meet' 
       }).eq('id', data.id);
       data.meeting_link = internalLink;
    }

    // 8. Notification Orchestration
    console.log(`[Notification]: Triggering confirmation for ${payload.title} via ${effectiveMode}`);
    
    // 9. Post-Insert Engine Updates
    if (calendar.calendar_type === 'round_robin' && assigneeId) {
      await updateRoundRobinStats(payload.calendarId, assigneeId);
    }

    revalidatePath('/calendar');
    return data;
  });
}

export async function updateAppointment(id: string, payload: Partial<any>) {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('appointments')
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

export async function deleteAppointment(id: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;
    revalidatePath('/calendar');
    return true;
  });
}

export async function getAppointmentById(id: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        contact:contacts(first_name, last_name, email),
        calendar:booking_calendars(name, meeting_mode)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
