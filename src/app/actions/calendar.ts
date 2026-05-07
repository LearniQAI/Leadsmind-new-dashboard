'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getAppointments() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        title,
        start_time,
        end_time,
        status,
        waitlist_enabled,
        current_attendee_count,
        max_attendees,
        calendar_id,
        contact_id,
        contacts (first_name, last_name, email)
      `)
      .eq('workspace_id', workspaceId)
      .order('start_time', { ascending: true });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch appointments' };
  }
}

export async function getWaitlist(appointmentId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('booking_waitlists')
      .select(`
        id,
        position,
        offered_at,
        confirmed,
        contacts (id, first_name, last_name, email)
      `)
      .eq('workspace_id', workspaceId)
      .eq('appointment_id', appointmentId)
      .order('position', { ascending: true });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message || 'Failed to fetch waitlist' };
  }
}
