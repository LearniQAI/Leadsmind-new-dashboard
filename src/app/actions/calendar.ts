'use server';
import { getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { toClientError } from '@/shared/errors/AppError';

/**
 * --- HELPER: STANDARD ACTION WRAPPER ---
 * Ensures consistent error handling and response format across all actions.
 */
async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();
  const data = await action(supabase, workspaceId);
  return { success: true, data };
 } catch (err: any) {
  logger.error({ err }, 'calendar.action.failed');
  const clientError = toClientError(err);
  return { success: false, error: clientError.error };
 }
}

/**
 * --- BOOKING & APPOINTMENTS ---
 */

export async function updateAppointmentStatus(id: string, status: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    revalidatePath('/apps/calendar');
    return true;
  });
}

/**
 * --- INTELLIGENT ROUTING (OUTCOMES) ---
 */

export async function createOutcome(payload: {
 calendarId: string;
 label: string;
 description?: string;
 durationMinutes?: number;
 assignedUserIds?: string[];
 pipelineStageId?: string;
 postMeetingWorkflowId?: string;
}) {
 return executeAction(async (supabase, workspaceId) => {
  const { data, error } = await supabase
   .from('booking_outcomes')
   .insert({
    workspace_id: workspaceId,
    calendar_id: payload.calendarId,
    label: payload.label,
    description: payload.description,
    duration_minutes: payload.durationMinutes || 30,
    assigned_user_ids: payload.assignedUserIds || [],
    pipeline_stage_id: payload.pipelineStageId,
    post_meeting_workflow_id: payload.postMeetingWorkflowId
   })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/apps/calendar');
  return data;
 });
}

// --- INTAKE FORMS ---

export async function saveIntakeForm(calendarId: string, fields: any[]) {
 return executeAction(async (supabase, workspaceId) => {
  const { data, error } = await supabase
   .from('booking_intake_forms')
   .upsert({
    workspace_id: workspaceId,
    calendar_id: calendarId,
    fields,
    updated_at: new Date().toISOString()
   }, { onConflict: 'calendar_id' })
   .select()
   .single();

  if (error) throw error;
  return data;
 });
}

export async function getComprehensiveCalendarAnalytics() {
 return executeAction(async (supabase, workspaceId) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [allApts, monthApts, slotAnalytics] = await Promise.all([
   supabase.from('appointments').select('*').eq('workspace_id', workspaceId),
   supabase.from('appointments').select('*').eq('workspace_id', workspaceId).gte('start_time', startOfMonth.toISOString()),
   supabase.from('booking_slot_analytics').select('*').eq('workspace_id', workspaceId)
  ]);

  const dowDist = [0, 0, 0, 0, 0, 0, 0];
  allApts.data?.forEach((a: any) => {
    const d = new Date(a.start_time).getUTCDay();
    dowDist[d]++;
  });

  return {
   totalBookings: allApts.data?.length || 0,
   monthBookings: monthApts.data?.length || 0,
   showUpRate: allApts.data?.length ? (allApts.data.filter((a: any) => a.status === 'showed_up').length / allApts.data.length) * 100 : 0,
   dowDistribution: dowDist,
   slotAnalytics: slotAnalytics.data || [],
  };
 });
}

// --- WAITLISTS ---

export async function getWaitlistEntries(appointmentId: string) {
 return executeAction(async (supabase, workspaceId) => {
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
  return data;
 });
}

export async function offerWaitlistSpot(waitlistId: string) {
 return executeAction(async (supabase, workspaceId) => {
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  
  const { data: waitlistEntry, error: updateErr } = await supabase
   .from('booking_waitlists')
   .update({
    offered_at: new Date().toISOString(),
    offer_expires_at: expiresAt
   })
  .eq("id", waitlistId).eq("workspace_id", workspaceId)
   .select('*, contact:contacts(first_name, last_name, email), appointment:appointments(title)')
   .single();

  if (updateErr) throw updateErr;

  revalidatePath('/apps/calendar/waitlist');
  return waitlistEntry;
 });
}

export async function addContactToWaitlist(appointmentId: string, email: string) {
 return executeAction(async (supabase, workspaceId) => {
  let { data: contact } = await supabase.from('contacts').select('id').eq('email', email).eq('workspace_id', workspaceId).single();
  
  if (!contact) {
   const { data: newContact, error: createErr } = await supabase
    .from('contacts')
    .insert({
     workspace_id: workspaceId,
     email,
     first_name: email.split('@')[0]
    })
    .select()
    .single();
   
   if (createErr) throw createErr;
   contact = newContact;
  }

  const { data, error } = await supabase.rpc('fn_secure_booking_or_waitlist', {
   p_workspace_id: workspaceId,
   p_appointment_id: appointmentId,
   p_contact_id: contact.id
  });

  if (error) throw error;
  
  revalidatePath('/apps/calendar/waitlist');
  return data;
 });
}
