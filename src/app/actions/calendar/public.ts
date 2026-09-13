'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getAvailableSlots, getRoundRobinAssignee } from './scheduling';
import { createSupportTicket } from '@/lib/calendar/crossConnect';
import { addMinutes, parseISO } from 'date-fns';
import { logPopiaConsent } from '@/lib/calendar/popia';
import { createTemporaryBookingLease, generatePayFastCheckoutUrl } from '@/lib/calendar/payfast';
import { syncBookingToExternal } from '@/lib/calendar/calendarSync';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '@/lib/calendar/bookingErrors';
import { sendBookingConfirmation } from '@/lib/calendar/notifications';
import { resolveMeetingLink, applyResolvedMeetingLink } from '@/lib/calendar/meetingLink';
import { sendWaitlistJoinAck } from '@/lib/calendar/waitlist';
import { isGroupSessionType } from '@/lib/calendar/calendarTypes';
import { logger } from '@/shared/logger';

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

  if (calError || !calendar) {
    if (calError) logger.error({ err: calError, calendarId }, 'calendar.public_booking.calendar_fetch.failed');
    return { success: false, error: 'Calendar configuration not found' };
  }

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

  if (contactError || !contact) {
    if (contactError) logger.error({ err: contactError, calendarId, workspaceId: calendar.workspace_id }, 'calendar.public_booking.contact_sync.failed');
    return { success: false, error: 'Failed to synchronize contact details' };
  }

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
      logger.warn({ err: rrErr, calendarId }, 'calendar.public_booking.round_robin.fallback');
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

  if (aptError || !appointment) {
    if (aptError) {
      if (isSlotConflictError(aptError)) {
        return { success: false, error: SLOT_CONFLICT_MESSAGE };
      }
      logger.error({ err: aptError, calendarId, workspaceId: calendar.workspace_id }, 'calendar.public_booking.appointment_create.failed');
    }
    return { success: false, error: 'Failed to record appointment' };
  }

  // Resolve the real meeting link — never a fabricated one (Task 63).
  // google_meet => real Google Meet link (host's Task 62 connection) or an
  // honest LeadsMind-room fallback; zoom => null + "coming soon" status.
  const resolved = await resolveMeetingLink({
    appointmentId: appointment.id,
    requestedMode: calendar.meeting_mode,
    hostUserId: appointment.user_id ?? null,
    workspaceId: calendar.workspace_id,
    calendarCustomLink: calendar.custom_link ?? calendar.location ?? null,
    title: appointment.title,
    startTime: appointment.start_time,
    endTime: appointment.end_time,
  });
  await supabase
    .from('appointments')
    .update({
      meeting_link: resolved.meetingLink,
      meeting_mode: resolved.meetingMode,
      // applyResolvedMeetingLink persists google_event_id / zoom_meeting_id /
      // teams_meeting_id + the host, so reschedule/cancel can sync the real
      // event/meeting (Task 63/70).
      metadata: applyResolvedMeetingLink(appointment.metadata, resolved),
    })
    .eq('id', appointment.id);

  // (round-robin booking_count is incremented atomically inside getRoundRobinAssignee)

  // Outbound push calendar synchronization
  try {
    await syncBookingToExternal(appointment.id);
  } catch (syncErr) {
    logger.error({ err: syncErr, appointmentId: appointment.id }, 'calendar.public_booking.external_sync.failed');
  }

  // Auto-create Support Ticket if support calendar
  try {
    await createSupportTicket(appointment.id);
  } catch (supportErr) {
    logger.error({ err: supportErr, appointmentId: appointment.id }, 'calendar.public_booking.support_ticket.failed');
  }

  // Real confirmation email to the booker + the assigned/host team member —
  // previously nothing was sent at all on this path (calendar.md Part B).
  // Best-effort: a notification failure must not fail a booking that already
  // succeeded and has a real appointments row.
  try {
    await sendBookingConfirmation(appointment.id, { reason: 'booked' });
  } catch (notifyErr) {
    logger.error({ err: notifyErr, appointmentId: appointment.id }, 'calendar.public_booking.confirmation_email.failed');
  }

  return { success: true, appointmentId: appointment.id };
}

/**
 * Public action to fetch slots for a specific date
 */
export async function fetchPublicSlots(calendarId: string, date: string) {
  return await getAvailableSlots(calendarId, date);
}

/**
 * Public action for a group-session calendar (Class or Webinar): reserve a
 * spot for a given session time, or — if that session is full and the
 * calendar has a waitlist — join the waitlist. Reuses the existing
 * fn_secure_booking_or_waitlist DB function (atomic capacity check +
 * first-come-first-served waitlist insert) rather than reimplementing that
 * logic. Real, shared infrastructure for both types — see
 * docs/calendar-webinar-feature.md for the Class-vs-Webinar decision.
 *
 * Returns { success, mode: 'booked' | 'waitlist', position? }.
 */
export async function bookGroupSession(
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
  if (!leadData.popiaConsent) {
    return { success: false, error: 'You must accept the POPIA consent agreement.' };
  }

  const supabase = createAdminClient();

  const { data: calendar, error: calError } = await supabase
    .from('booking_calendars')
    .select('*')
    .eq('id', calendarId)
    .single();
  if (calError || !calendar) return { success: false, error: 'Calendar configuration not found' };
  if (!isGroupSessionType(calendar.calendar_type)) {
    return { success: false, error: 'This is not a group-session calendar.' };
  }

  // Contact upsert (identical to bookAppointment).
  const { data: contact, error: contactError } = await supabase
    .from('contacts')
    .upsert(
      {
        workspace_id: calendar.workspace_id,
        email: leadData.email,
        first_name: leadData.firstName,
        last_name: leadData.lastName,
        phone: leadData.phone,
      },
      { onConflict: 'workspace_id,email' }
    )
    .select()
    .single();
  if (contactError || !contact) return { success: false, error: 'Failed to save your details' };

  await logPopiaConsent(contact.id, calendar.workspace_id, leadData.email).catch(() => {});

  const startTime = parseISO(slot);
  const endTime = addMinutes(startTime, calendar.slot_duration || 30);
  const capacity = Math.max(1, calendar.capacity ?? 1);

  // Is there already a session at this time?
  const { data: session } = await supabase
    .from('appointments')
    .select('id, current_attendee_count, max_attendees')
    .eq('calendar_id', calendarId)
    .eq('status', 'scheduled')
    .eq('start_time', startTime.toISOString())
    .maybeSingle();

  // --- No session yet: create it, this contact is the first attendee ---
  if (!session) {
    // Re-validate the slot is a real, open time on the calendar.
    const available = await getAvailableSlots(calendarId, slot.split('T')[0]);
    if (!available.some((s: any) => s.start === slot)) {
      return { success: false, error: 'That session time is no longer available.' };
    }

    const { data: created, error: createErr } = await supabase
      .from('appointments')
      .insert({
        workspace_id: calendar.workspace_id,
        calendar_id: calendarId,
        contact_id: contact.id,
        title: calendar.name,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        meeting_mode: calendar.meeting_mode,
        max_attendees: capacity,
        current_attendee_count: 0,
        waitlist_enabled: !!calendar.waitlist_enabled,
        metadata: { notes: leadData.notes, booked_publicly: true, answers: leadData.answers || {}, group_session: true },
      })
      .select()
      .single();

    if (createErr || !created) {
      logger.error({ err: createErr, calendarId }, 'calendar.group_session.session_create.failed');
      return { success: false, error: 'Failed to reserve your spot' };
    }

    // Book the creator as a real per-attendee record via the same atomic DB
    // function every other attendee goes through (increments the count to 1 +
    // writes their booking_waitlists row). Keeps one code path for "book a spot".
    const { data: firstRpc, error: firstRpcErr } = await supabase.rpc('fn_secure_booking_or_waitlist', {
      p_workspace_id: calendar.workspace_id,
      p_appointment_id: created.id,
      p_contact_id: contact.id,
    });
    if (firstRpcErr || !firstRpc?.success) {
      logger.error({ err: firstRpcErr, appointmentId: created.id }, 'calendar.group_session.first_attendee.failed');
      return { success: false, error: 'Failed to reserve your spot' };
    }

    const resolved = await resolveMeetingLink({
      appointmentId: created.id,
      requestedMode: calendar.meeting_mode,
      hostUserId: null,
      workspaceId: calendar.workspace_id,
      calendarCustomLink: calendar.custom_link ?? calendar.location ?? null,
      title: created.title,
      startTime: created.start_time,
      endTime: created.end_time,
    });
    await supabase
      .from('appointments')
      .update({
        meeting_link: resolved.meetingLink,
        meeting_mode: resolved.meetingMode,
        metadata: applyResolvedMeetingLink(created.metadata, resolved),
      })
      .eq('id', created.id);

    try {
      await sendBookingConfirmation(created.id, {
        reason: 'booked',
        overrideRecipient: { email: contact.email, name: `${contact.first_name} ${contact.last_name}`.trim() || null },
        attendeeRecordId: firstRpc.attendee_id,
      });
    } catch (e) {
      logger.error({ err: e, appointmentId: created.id }, 'calendar.group_session.confirmation_email.failed');
    }
    return { success: true, mode: 'booked' as const, appointmentId: created.id };
  }

  // --- Session exists: atomic book-or-waitlist via the DB function ---
  const { data: rpc, error: rpcErr } = await supabase.rpc('fn_secure_booking_or_waitlist', {
    p_workspace_id: calendar.workspace_id,
    p_appointment_id: session.id,
    p_contact_id: contact.id,
  });

  if (rpcErr || !rpc?.success) {
    return { success: false, error: rpc?.error || 'This session is full.' };
  }

  if (rpc.mode === 'already_booked') {
    // Idempotent re-submit — they already hold a spot; don't re-email.
    return { success: true, mode: 'booked' as const, appointmentId: session.id };
  }

  if (rpc.mode === 'booked') {
    try {
      await sendBookingConfirmation(session.id, {
        reason: 'booked',
        overrideRecipient: { email: contact.email, name: `${contact.first_name} ${contact.last_name}`.trim() || null },
        attendeeRecordId: rpc.attendee_id,
      });
    } catch { /* best-effort */ }
    return { success: true, mode: 'booked' as const, appointmentId: session.id };
  }

  // mode === 'waitlist'
  try {
    await sendWaitlistJoinAck(session.id, contact.id, rpc.position);
  } catch (e) {
    logger.error({ err: e, appointmentId: session.id }, 'calendar.group_session.waitlist_ack_email.failed');
  }
  return { success: true, mode: 'waitlist' as const, position: rpc.position };
}
