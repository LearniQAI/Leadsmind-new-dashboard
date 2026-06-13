'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getAvailableSlots, getRoundRobinAssignee, updateRoundRobinStats } from './scheduling';
import { createSupportTicket } from '@/lib/calendar/crossConnect';
import { addMinutes, parseISO } from 'date-fns';
import { logPopiaConsent } from '@/lib/calendar/popia';
import { createTemporaryBookingLease, generatePayFastCheckoutUrl } from '@/lib/calendar/payfast';
import { syncBookingToExternal } from '@/lib/calendar/calendarSync';

/**
 * Public action to book an appointment or redirect to checkout
 */
export async function bookAppointment(
  calendarId: string,
  slot: string,
  leadData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    notes?: string;
    popiaConsent: boolean;
    answers?: Record<string, string>;
  }
) {
  // 1. Non-bypassable POPIA consent validation
  if (!leadData.popiaConsent) {
    return { success: false, error: 'You must accept the POPIA consent agreement to request a booking.' };
  }

  const supabase = createAdminClient();

  // 2. Fetch Calendar Metadata
  const { data: calendar, error: calError } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('id', calendarId)
    .single();

  if (calError || !calendar) return { success: false, error: 'Calendar configuration not found' };

  // 3. Validate Slot is still available
  const date = slot.split('T')[0];
  const available = await getAvailableSlots(calendarId, date);
  const isStillAvailable = available.some(s => s.start === slot);
  
  if (!isStillAvailable) return { success: false, error: 'This slot was just taken. Please select another time.' };

  // 4. Create or Update Contact
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert({
      workspace_id: calendar.workspace_id,
      email: leadData.email,
      first_name: leadData.firstName,
      last_name: leadData.lastName,
      phone: leadData.phone
    }, { onConflict: 'workspace_id,email' })
    .select()
    .single();

  if (contactError || !contact) return { success: false, error: 'Failed to synchronize contact details' };

  // 5. Generate and Vault Cryptographic POPIA Consent
  const popiaHash = await logPopiaConsent(contact.id, calendar.workspace_id, leadData.email);

  // 6. Handle Paid Consultation checkout redirects
  const price = parseFloat(calendar.price || '0');
  if (price > 0) {
    // Establish temporary leasehold (5 minutes optimistic lock)
    const leaseRes = await createTemporaryBookingLease(calendarId, slot, contact.id, calendar.workspace_id);
    if (!leaseRes.success || !leaseRes.leaseId) {
      return { success: false, error: leaseRes.error || 'Failed to secure temporary booking lock.' };
    }

    // Generate PayFast redirect checkout URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const payfastUrl = generatePayFastCheckoutUrl({
      merchantId: process.env.PAYFAST_MERCHANT_ID || '10000100',
      merchantKey: process.env.PAYFAST_MERCHANT_KEY || '46f0z550522ac',
      returnUrl: `${appUrl}/book/success?lease_id=${leaseRes.leaseId}`,
      cancelUrl: `${appUrl}/book/cancel?lease_id=${leaseRes.leaseId}`,
      notifyUrl: `${appUrl}/api/payfast/webhook`,
      amount: price,
      itemName: `Consultation: ${calendar.name}`,
      paymentId: leaseRes.leaseId,
      firstName: leadData.firstName,
      lastName: leadData.lastName,
      email: leadData.email,
    });

    return { success: true, checkoutRequired: true, redirectUrl: payfastUrl };
  }

  // 7. Free Booking Path
  // Handle Round Robin selection if configured
  let assigneeId = calendar.workspace_id; // Default to workspace owner
  if (calendar.calendar_type === 'round_robin') {
    try {
      assigneeId = await getRoundRobinAssignee(calendarId, calendar.workspace_id);
    } catch (rrErr) {
      console.warn('[public-booking] Round robin allocation failed, falling back:', rrErr);
    }
  }

  const startTime = parseISO(slot);
  const endTime = addMinutes(startTime, calendar.slot_duration || 30);

  const { data: appointment, error: aptError } = await supabase
    .from('appointments')
    .insert({
      workspace_id: calendar.workspace_id,
      calendar_id: calendarId,
      contact_id: contact.id,
      user_id: assigneeId !== calendar.workspace_id ? assigneeId : null,
      title: `Meeting with ${leadData.firstName} ${leadData.lastName}`,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: 'scheduled',
      metadata: {
        notes: leadData.notes,
        meeting_mode: calendar.meeting_mode,
        booked_publicly: true,
        popia_signature_hash: popiaHash,
        answers: leadData.answers || {},
      }
    })
    .select()
    .single();

  if (aptError || !appointment) return { success: false, error: 'Failed to record appointment' };

  // Generate Internal meeting links if appropriate
  if (calendar.meeting_mode === 'internal_meet' || (calendar.meeting_mode === 'custom_link' && !calendar.custom_link)) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const internalLink = `${baseUrl}/meet/${appointment.id}`;
    
    await supabase
      .from('appointments')
      .update({ meeting_link: internalLink, meeting_mode: 'internal_meet' })
      .eq('id', appointment.id);
  } else if (calendar.custom_link) {
    await supabase
      .from('appointments')
      .update({ meeting_link: calendar.custom_link })
      .eq('id', appointment.id);
  }

  // Update RR metrics
  if (calendar.calendar_type === 'round_robin' && assigneeId !== calendar.workspace_id) {
    await updateRoundRobinStats(calendarId, assigneeId);
  }

  // Outbound push calendar synchronization
  try {
    await syncBookingToExternal(appointment.id);
  } catch (syncErr) {
    console.error('[public-booking] Syncing external calendar failed:', syncErr);
  }

  // Auto-create Support Ticket if support calendar
  try {
    await createSupportTicket(appointment.id);
  } catch (supportErr) {
    console.error('[public-booking] Support ticket creation error:', supportErr);
  }

  return { success: true, appointmentId: appointment.id };
}

/**
 * Public action to fetch slots for a specific date
 */
export async function fetchPublicSlots(calendarId: string, date: string) {
  return await getAvailableSlots(calendarId, date);
}
