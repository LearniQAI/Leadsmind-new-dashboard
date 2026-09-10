'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getPortalSession } from '@/lib/portal/session';
import { revalidatePath } from 'next/cache';
import { getAvailableSlots, getRoundRobinAssignee } from './calendar/scheduling';
import { addMinutes, parseISO } from 'date-fns';
import { createTemporaryBookingLease, generatePayFastCheckoutUrl } from '@/lib/calendar/payfast';
import { syncBookingToExternal, pushEventCancellation, pushEventTimeUpdate } from '@/lib/calendar/calendarSync';
import { notifyNewlyOfferedWaitlist, cancelAttendeeSpot } from '@/lib/calendar/waitlist';
import { createSupportTicket } from '@/lib/calendar/crossConnect';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '@/lib/calendar/bookingErrors';
import { sendBookingConfirmation, sendCancellationNotice, sendRescheduleNotice } from '@/lib/calendar/notifications';
import { resolveMeetingLink, applyResolvedMeetingLink } from '@/lib/calendar/meetingLink';
import { logger } from '@/shared/logger';

/**
 * Client Portal booking server action to schedule an appointment slot
 */
export async function bookAppointmentFromPortal(payload: {
  calendarId: string;
  slot: string;
  notes?: string;
  answers?: Record<string, string>;
}) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized. Client session context required.' };
    }

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    // 1. Fetch Calendar Metadata
    const { data: calendar, error: calError } = await adminClient
      .from('booking_calendars')
      .select('*')
      .eq('id', payload.calendarId)
      .eq('workspace_id', workspace.id)
      .single();

    if (calError || !calendar) return { success: false, error: 'Calendar configuration not found' };

    // 2. Validate Slot is still available
    const date = payload.slot.split('T')[0];
    const available = await getAvailableSlots(payload.calendarId, date);
    const isStillAvailable = available.some(s => s.start === payload.slot);
    
    if (!isStillAvailable) return { success: false, error: 'This slot was just taken. Please select another time.' };

    // 3. Paid check (Generate PayFast link if a consultation is priced)
    const price = parseFloat(calendar.price || '0');
    if (price > 0) {
      const leaseRes = await createTemporaryBookingLease(payload.calendarId, payload.slot, contact.id, workspace.id);
      if (!leaseRes.success || !leaseRes.leaseId) {
        return { success: false, error: leaseRes.error || 'Failed to secure temporary booking lock.' };
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const payfastUrl = generatePayFastCheckoutUrl({
        merchantId: process.env.PAYFAST_MERCHANT_ID || '10000100',
        merchantKey: process.env.PAYFAST_MERCHANT_KEY || '46f0z550522ac',
        returnUrl: `${appUrl}/portal/bookings?checkout=success&lease_id=${leaseRes.leaseId}`,
        cancelUrl: `${appUrl}/portal/bookings?checkout=cancel&lease_id=${leaseRes.leaseId}`,
        notifyUrl: `${appUrl}/api/payfast/webhook`,
        amount: price,
        itemName: `Consultation: ${calendar.name}`,
        paymentId: leaseRes.leaseId,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
      });

      return { success: true, checkoutRequired: true, redirectUrl: payfastUrl };
    }

    // 4. Free Booking Path
    let assigneeId = workspace.id; // Default to workspace owner
    if (calendar.calendar_type === 'round_robin') {
      try {
        assigneeId = await getRoundRobinAssignee(payload.calendarId, workspace.id);
      } catch (rrErr) {
        logger.warn({ err: rrErr, calendarId: payload.calendarId }, 'portal_bookings.round_robin.fallback');
      }
    }

    const startTime = parseISO(payload.slot);
    const endTime = addMinutes(startTime, calendar.slot_duration || 30);

    const { data: appointment, error: aptError } = await adminClient
      .from('appointments')
      .insert({
        workspace_id: workspace.id,
        calendar_id: payload.calendarId,
        contact_id: contact.id,
        user_id: assigneeId !== workspace.id ? assigneeId : null,
        title: `Portal Booking: ${calendar.name}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        metadata: {
          notes: payload.notes,
          meeting_mode: calendar.meeting_mode,
          booked_from_portal: true,
          answers: payload.answers || {},
        }
      })
      .select()
      .single();

    if (aptError || !appointment) {
      if (aptError) {
        if (isSlotConflictError(aptError)) {
          return { success: false, error: SLOT_CONFLICT_MESSAGE };
        }
        logger.error({ err: aptError, workspaceId: workspace.id }, 'portal_bookings.appointment.create.failed');
      }
      return { success: false, error: 'Failed to record appointment.' };
    }

    // Resolve the real meeting link — never a fabricated one (Task 63).
    const resolved = await resolveMeetingLink({
      appointmentId: appointment.id,
      requestedMode: calendar.meeting_mode,
      hostUserId: appointment.user_id ?? null,
      workspaceId: workspace.id,
      calendarCustomLink: calendar.custom_link ?? calendar.location ?? null,
      title: appointment.title,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
    });
    await adminClient
      .from('appointments')
      .update({
        meeting_link: resolved.meetingLink,
        meeting_mode: resolved.meetingMode,
        metadata: applyResolvedMeetingLink(appointment.metadata, resolved),
      })
      .eq('id', appointment.id);

    // (round-robin booking_count is incremented atomically inside getRoundRobinAssignee)

    // Outbound push calendar synchronization
    try {
      await syncBookingToExternal(appointment.id);
    } catch (syncErr) {
      logger.error({ err: syncErr, appointmentId: appointment.id }, 'portal_bookings.external_sync.failed');
    }

    // Auto-create Support Ticket if support calendar
    try {
      await createSupportTicket(appointment.id);
    } catch (supportErr) {
      logger.error({ err: supportErr, appointmentId: appointment.id }, 'portal_bookings.support_ticket.failed');
    }

    // Insert activity log
    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'calendar',
      description: `Client booked a consultation: "${calendar.name}"`
    });

    try {
      await sendBookingConfirmation(appointment.id, { reason: 'booked' });
    } catch (notifyErr) {
      logger.error({ err: notifyErr, appointmentId: appointment.id }, 'portal_bookings.confirmation_email.failed');
    }

    revalidatePath('/portal/bookings');
    return { success: true };
  } catch (err: any) {
    logger.error({ err }, 'portal_bookings.book_appointment.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Self-service cancellation from Client Portal, enforcing preset rules
 */
export async function cancelAppointmentFromPortal(appointmentId: string) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    // 1. Fetch appointment details
    const { data: appt, error: apptErr } = await adminClient
      .from('appointments')
      .select('*, calendar:booking_calendars(*)')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return { success: false, error: 'Appointment session not found.' };
    }

    // 2. Security Check: Ownership
    if (appt.contact_id !== contact.id || appt.workspace_id !== workspace.id) {
      return { success: false, error: 'Access denied. You do not own this appointment.' };
    }

    // 3. Adhere to Preset Cancellation Window
    const startTime = new Date(appt.start_time).getTime();
    const cancelWindowHours = appt.calendar?.cancellation_window_hours ?? 24;
    const cancelWindowMs = cancelWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    if (startTime - now < cancelWindowMs) {
      return { 
        success: false, 
        error: `Cancellation window locked. You cannot modify or cancel this session within ${cancelWindowHours} hours of its scheduled start.` 
      };
    }

    // 4. Update appointment status to cancelled. For a GROUP SESSION, also
    //    decrement current_attendee_count so the freed spot triggers the
    //    waitlist — mirrors manage.ts's cancelAppointmentByToken (this was
    //    missing here entirely).
    const isGroupSession = (appt.max_attendees ?? 1) > 1;
    const freesGroupSpot = isGroupSession && (appt.current_attendee_count ?? 0) > 0;
    const cancelPayload: Record<string, any> = { status: 'cancelled', updated_at: new Date().toISOString() };
    if (freesGroupSpot) {
      cancelPayload.current_attendee_count = (appt.current_attendee_count ?? 1) - 1;
    }

    const { error: updateErr } = await adminClient
      .from('appointments')
      .update(cancelPayload)
      .eq('id', appointmentId);

    if (updateErr) {
      logger.error({ err: updateErr, appointmentId }, 'portal_bookings.cancel.update_failed');
      return { success: false, error: 'Failed to cancel appointment.' };
    }

    // The DB trigger has marked the next waitlisted person offered — email them.
    if (freesGroupSpot) {
      try {
        await notifyNewlyOfferedWaitlist(appointmentId);
      } catch (wlErr) {
        logger.error({ err: wlErr, appointmentId }, 'portal_bookings.cancel.waitlist_offer_failed');
      }
    }

    // Remove the host's real calendar event too (best-effort).
    try {
      await pushEventCancellation(appointmentId);
    } catch (syncErr) {
      logger.error({ err: syncErr, appointmentId }, 'portal_bookings.cancel.calendar_sync_failed');
    }

    // 5. CRM activity log
    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'calendar',
      description: `Client cancelled meeting: "${appt.title}"`
    });

    try {
      await sendCancellationNotice(appointmentId, new Date(appt.start_time).toLocaleString());
    } catch (notifyErr) {
      logger.error({ err: notifyErr, appointmentId }, 'portal_bookings.cancellation_email.failed');
    }

    revalidatePath('/portal/bookings');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, appointmentId }, 'portal_bookings.cancel_appointment.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Client Portal: a group-session attendee cancels ONLY their own spot. Unlike
 * cancelAppointmentFromPortal (which flips appointments.status), this marks just
 * the caller's own booking_waitlists row cancelled, frees one seat, and lets the
 * waitlist fill it. The session and every other attendee are untouched. This is
 * the path for any attendee who is NOT the session's contact_id — and also for
 * the first booker, so "I cancel" never means "the whole class is cancelled".
 */
export async function cancelMyClassSpot(appointmentId: string) {
  try {
    const session = await getPortalSession();
    if (!session) return { success: false, error: 'Unauthorized.' };

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    const { data: record } = await adminClient
      .from('booking_waitlists')
      .select('id, workspace_id')
      .eq('appointment_id', appointmentId)
      .eq('contact_id', contact.id)
      .eq('workspace_id', workspace.id)
      .eq('confirmed', true)
      .is('cancelled_at', null)
      .maybeSingle();

    if (!record) {
      return { success: false, error: 'You do not have an active spot on this session.' };
    }

    const res = await cancelAttendeeSpot(record.id);
    if (!res.success) return { success: false, error: res.error };

    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'calendar',
      description: `Client cancelled their spot on a group session`,
    });

    revalidatePath('/portal/bookings');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, appointmentId }, 'portal_bookings.cancel_class_spot.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

/**
 * Self-service rescheduling from Client Portal, enforcing preset rules and slot validations
 */
export async function rescheduleAppointmentFromPortal(appointmentId: string, newSlot: string) {
  try {
    const session = await getPortalSession();
    if (!session) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { contact, workspace } = session;
    const adminClient = createAdminClient();

    // 1. Fetch appointment details
    const { data: appt, error: apptErr } = await adminClient
      .from('appointments')
      .select('*, calendar:booking_calendars(*)')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return { success: false, error: 'Appointment session not found.' };
    }

    // 2. Security Check: Ownership
    if (appt.contact_id !== contact.id || appt.workspace_id !== workspace.id) {
      return { success: false, error: 'Access denied. You do not own this appointment.' };
    }

    // 3. Adhere to Preset Modification Window
    const oldStartTime = new Date(appt.start_time).getTime();
    const cancelWindowHours = appt.calendar?.cancellation_window_hours ?? 24;
    const cancelWindowMs = cancelWindowHours * 60 * 60 * 1000;
    const now = Date.now();

    if (oldStartTime - now < cancelWindowMs) {
      return { 
        success: false, 
        error: `Modification window locked. You cannot reschedule this session within ${cancelWindowHours} hours of its start.` 
      };
    }

    // 4. Validate if newSlot is still available
    const date = newSlot.split('T')[0];
    const available = await getAvailableSlots(appt.calendar_id, date);
    const isStillAvailable = available.some(s => s.start === newSlot);
    
    if (!isStillAvailable) {
      return { success: false, error: 'The requested reschedule slot is no longer available.' };
    }

    // 5. Compute new times
    const newStart = parseISO(newSlot);
    const newEnd = addMinutes(newStart, appt.calendar?.slot_duration || 30);

    // 6. Update appointment times
    const { error: updateErr } = await adminClient
      .from('appointments')
      .update({
        start_time: newStart.toISOString(),
        end_time: newEnd.toISOString(),
        status: 'scheduled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateErr) {
      logger.error({ err: updateErr, appointmentId }, 'portal_bookings.reschedule.update_failed');
      return { success: false, error: 'Failed to save reschedule update.' };
    }

    // 7. Move the host's existing calendar event to the new time — NOT
    //    syncBookingToExternal(), which always POSTs a fresh event and would
    //    leave a duplicate at the old time.
    try {
      await pushEventTimeUpdate(appointmentId);
    } catch (syncErr) {
      logger.error({ err: syncErr, appointmentId }, 'portal_bookings.reschedule.external_sync.failed');
    }

    // 8. CRM activity log
    await adminClient.from('contact_activities').insert({
      workspace_id: workspace.id,
      contact_id: contact.id,
      type: 'calendar',
      description: `Client rescheduled meeting: "${appt.title}" to ${newStart.toLocaleDateString()}`
    });

    try {
      await sendRescheduleNotice(appointmentId, new Date(appt.start_time).toLocaleString());
    } catch (notifyErr) {
      logger.error({ err: notifyErr, appointmentId }, 'portal_bookings.reschedule_email.failed');
    }

    revalidatePath('/portal/bookings');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, appointmentId }, 'portal_bookings.reschedule_appointment.failed');
    return { success: false, error: 'An unexpected error occurred.' };
  }
}
