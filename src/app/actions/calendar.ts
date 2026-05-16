'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

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
  console.error('[CalendarAction Error]:', err.message);
  return { success: false, error: err.message || 'Operation failed' };
 }
}

/**
 * --- CALENDAR MANAGEMENT ---
 */

export async function createCalendar(payload: {
 name: string;
 slug: string;
 description?: string;
 timezone?: string;
 slotDuration?: number;
 bufferTime?: number;
}) {
 const user = await requireAuth(); 
 return executeAction(async (supabase, workspaceId) => {
  const { data, error } = await supabase
   .from('booking_calendars')
   .insert({
    workspace_id: workspaceId,
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    timezone: payload.timezone || 'UTC',
    slot_duration: payload.slotDuration || 30,
    buffer_time: payload.bufferTime || 0
   })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/apps/calendar');
  return data;
 });
}

/**
 * --- BOOKING & APPOINTMENTS ---
 */

export async function getAppointments() {
 return executeAction(async (supabase, workspaceId) => {
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
  return data;
 });
}

export async function createBooking(payload: {
 calendarId: string;
 contactId: string;
 title: string;
 startTime: string;
 endTime: string;
 outcomeId?: string;
}) {
 return executeAction(async (supabase, workspaceId) => {
  const { data, error } = await supabase
   .from('appointments')
   .insert({
    workspace_id: workspaceId,
    calendar_id: payload.calendarId,
    contact_id: payload.contactId,
    title: payload.title,
    start_time: payload.startTime,
    end_time: payload.endTime,
    outcome_id: payload.outcomeId,
    status: 'scheduled'
   })
   .select()
   .single();

  if (error) throw error;
  return data;
 });
}

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

export async function deleteAppointment(id: string) {
  return executeAction(async (supabase, workspaceId) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
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

export async function getCalendarOutcomes(calendarId: string) {
 return executeAction(async (supabase) => {
  const { data, error } = await supabase
   .from('booking_outcomes')
   .select('*')
   .eq('calendar_id', calendarId)
   .order('position', { ascending: true });

  if (error) throw error;
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

export async function getIntakeForm(calendarId: string) {
 return executeAction(async (supabase) => {
  const { data, error } = await supabase
   .from('booking_intake_forms')
   .select('*')
   .eq('calendar_id', calendarId)
   .single();

  if (error && error.code !== 'PGRST116') throw error; 
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

/**
 * --- ANALYTICS ---
 */

export async function getBookingAnalytics(workspaceId: string) {
 return executeAction(async (supabase) => {
  const { data, error } = await supabase
   .from('booking_slot_analytics')
   .select('*')
   .eq('workspace_id', workspaceId);

  if (error) throw error;
  return data;
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
   .eq('id', waitlistId)
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

// --- PACKAGES ---

export async function createPackage(payload: {
 name: string;
 totalCredits: number;
 price: number;
}) {
 return executeAction(async (supabase, workspaceId) => {
  const { data, error } = await supabase
   .from('booking_packages')
   .insert({
    workspace_id: workspaceId,
    name: payload.name,
    total_credits: payload.totalCredits,
    price: payload.price
   })
   .select()
   .single();

  if (error) throw error;
  revalidatePath('/apps/calendar');
  return data;
 });
}
