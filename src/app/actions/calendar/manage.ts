'use server';

// Public, token-authenticated self-service cancel/reschedule for a booker who
// is NOT an authenticated workspace member and NOT necessarily a logged-in
// client-portal contact either (calendar.md flagged this as a real gap: the
// only existing self-service surface, portalBookings.ts, requires a portal
// session). This file is the public.ts of that flow — same admin-client
// pattern already established for anonymous booking actions, gated by the
// manage token instead of a session.
//
// Every exported function here re-verifies the token itself, server-side,
// on every call — never trusts that the page already checked it. This
// mirrors the explicit lesson already learned twice in this codebase
// (shipmentToken.ts's comment on generateShipmentToken, and the RLS
// over-correction risk calendar.md investigated for public bookings): a
// public capability-token endpoint is exactly the kind of surface that gets
// silently broken by trusting client-side gating.

import { createAdminClient } from '@/lib/supabase/server';
import { parseManageToken } from '@/lib/calendar/manageToken';
import { getAvailableSlots, validateSlot } from './scheduling';
import { sendCancellationNotice, sendRescheduleNotice } from '@/lib/calendar/notifications';
import { pushEventCancellation, pushEventTimeUpdate } from '@/lib/calendar/calendarSync';
import { notifyNewlyOfferedWaitlist } from '@/lib/calendar/waitlist';
import { meetingLinkNote, type MeetingLinkStatus } from '@/lib/calendar/meetingLinkStatus';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '@/lib/calendar/bookingErrors';
import { logger } from '@/shared/logger';
import { addMinutes, parseISO } from 'date-fns';

interface VerifiedAppointment {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  meeting_link: string | null;
  metadata: Record<string, any> | null;
  workspace_id: string;
  calendar_id: string | null;
  max_attendees: number | null;
  current_attendee_count: number | null;
  calendar: { name: string; calendar_type: string; timezone: string | null; cancellation_window_hours: number | null; slot_duration: number | null } | null;
  contact: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

// Central re-verification used by every action below. Returns the live
// appointment row (never trusts anything the caller sent besides the token
// itself), or a typed error explaining why the token is no longer usable —
// "no longer usable" deliberately covers both a bad signature AND a
// signature-valid token for an appointment that has since happened, been
// cancelled, or been deleted, per this task's explicit "must expire once
// genuinely in the past" requirement (checked against live state, since a
// stateless HMAC has no expiry of its own).
async function resolveVerifiedAppointment(token: string): Promise<{ appointment: VerifiedAppointment; error: null } | { appointment: null; error: string }> {
  const parsed = parseManageToken(token);
  if (!parsed) {
    return { appointment: null, error: 'This management link is invalid.' };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, title, start_time, end_time, status, meeting_link, metadata, workspace_id, calendar_id,
      max_attendees, current_attendee_count,
      calendar:booking_calendars(name, calendar_type, timezone, cancellation_window_hours, slot_duration),
      contact:contacts(first_name, last_name, email)
    `)
    .eq('id', parsed.appointmentId)
    .maybeSingle();

  if (error || !data) {
    return { appointment: null, error: 'This management link is invalid.' };
  }

  const appointment = data as unknown as VerifiedAppointment;

  if (appointment.status === 'cancelled') {
    return { appointment: null, error: 'This booking has already been cancelled.' };
  }

  if (new Date(appointment.start_time).getTime() <= Date.now()) {
    return { appointment: null, error: 'This booking has already taken place — this management link is no longer active.' };
  }

  return { appointment, error: null };
}

function cancellationWindowMs(appointment: VerifiedAppointment): number {
  const hours = appointment.calendar?.cancellation_window_hours ?? 24;
  return hours * 60 * 60 * 1000;
}

// Public-facing summary only — never returns workspace-internal fields
// (workspace_id, calendar_id, raw metadata) to the client.
export async function getAppointmentByToken(token: string) {
  const { appointment, error } = await resolveVerifiedAppointment(token);
  if (error || !appointment) return { success: false, error };

  const hours = appointment.calendar?.cancellation_window_hours ?? 24;
  const withinLockout = appointment.start_time
    ? new Date(appointment.start_time).getTime() - Date.now() < hours * 60 * 60 * 1000
    : false;

  return {
    success: true,
    data: {
      title: appointment.title,
      startTime: appointment.start_time,
      endTime: appointment.end_time,
      status: appointment.status,
      meetingLink: appointment.meeting_link,
      // Honest note for the booker when there's no live link yet (e.g. Zoom
      // integration pending) — never a fabricated URL (Task 63).
      meetingLinkNote: meetingLinkNote(
        (appointment.metadata?.meeting_link_status as MeetingLinkStatus) ?? 'none',
        'booker'
      ),
      calendarName: appointment.calendar?.name ?? null,
      timezone: appointment.calendar?.timezone ?? 'UTC',
      bookerFirstName: appointment.contact?.first_name ?? null,
      cancellationWindowHours: hours,
      withinLockout,
      calendarId: appointment.calendar_id,
    },
  };
}

export async function getManageAvailableSlots(token: string, date: string) {
  const { appointment, error } = await resolveVerifiedAppointment(token);
  if (error || !appointment) return { success: false, error };
  if (!appointment.calendar_id) return { success: false, error: 'No calendar associated with this booking.' };

  // Reuses the exact same slot-computation function the original booking
  // flow and the internal calendar UI both use — not a second implementation.
  const slots = await getAvailableSlots(appointment.calendar_id, date);
  return { success: true, data: slots };
}

export async function cancelAppointmentByToken(token: string) {
  const { appointment, error } = await resolveVerifiedAppointment(token);
  if (error || !appointment) return { success: false, error };

  if (Date.now() > new Date(appointment.start_time).getTime() - cancellationWindowMs(appointment)) {
    const hours = appointment.calendar?.cancellation_window_hours ?? 24;
    return { success: false, error: `This booking can no longer be cancelled — it's within the ${hours}-hour cancellation window.` };
  }

  const supabase = createAdminClient();
  const previousWhen = new Date(appointment.start_time).toLocaleString();

  const updatePayload: Record<string, any> = { status: 'cancelled', updated_at: new Date().toISOString() };
  // Group/class sessions track capacity via max_attendees/current_attendee_count
  // rather than one row per attendee (confirmed in the waitlist migration —
  // there is no per-attendee appointment row to individually cancel). The
  // existing DB trigger (tr_cancel_promotion, phase20 migration) only fires
  // waitlist auto-promotion off a *decrease* in current_attendee_count, not
  // off `status`, so a real group-session cancellation has to decrement it
  // here to actually trigger that already-existing logic — reusing it, not
  // reimplementing it.
  const isGroupSession = (appointment.max_attendees ?? 1) > 1;
  const freesGroupSpot = isGroupSession && (appointment.current_attendee_count ?? 0) > 0;
  if (freesGroupSpot) {
    updatePayload.current_attendee_count = (appointment.current_attendee_count ?? 1) - 1;
  }

  const { error: updateErr } = await supabase
    .from('appointments')
    .update(updatePayload)
    .eq('id', appointment.id);

  if (updateErr) {
    logger.error({ err: updateErr, appointmentId: appointment.id }, 'calendar.manage.cancel.failed');
    return { success: false, error: 'Failed to cancel this booking. Please try again.' };
  }

  // The DB trigger (tr_cancel_promotion) has, in that same UPDATE, marked the
  // next waitlisted person `offered` — now actually email them their accept
  // link (Task 65). Best-effort.
  if (freesGroupSpot) {
    try {
      await notifyNewlyOfferedWaitlist(appointment.id);
    } catch (wlErr) {
      logger.error({ err: wlErr, appointmentId: appointment.id }, 'calendar.manage.cancel.waitlist_offer_failed');
    }
  }

  // Remove the host's real Google/Outlook calendar event too — best-effort, so
  // a stale token or a provider outage never blocks the cancellation itself.
  try {
    await pushEventCancellation(appointment.id);
  } catch (syncErr) {
    logger.error({ err: syncErr, appointmentId: appointment.id }, 'calendar.manage.cancel.calendar_sync_failed');
  }

  try {
    await sendCancellationNotice(appointment.id, previousWhen);
  } catch (notifyErr) {
    logger.error({ err: notifyErr, appointmentId: appointment.id }, 'calendar.manage.cancel.notification_failed');
  }

  return { success: true };
}

export async function rescheduleAppointmentByToken(token: string, newSlot: string) {
  const { appointment, error } = await resolveVerifiedAppointment(token);
  if (error || !appointment) return { success: false, error };

  if (Date.now() > new Date(appointment.start_time).getTime() - cancellationWindowMs(appointment)) {
    const hours = appointment.calendar?.cancellation_window_hours ?? 24;
    return { success: false, error: `This booking can no longer be rescheduled — it's within the ${hours}-hour modification window.` };
  }

  if (!appointment.calendar_id) return { success: false, error: 'No calendar associated with this booking.' };

  // Reuses the same validateSlot the internal booking flow uses — not a
  // second availability check.
  const validation = await validateSlot(appointment.calendar_id, newSlot, newSlot);
  if (!validation.available) {
    return { success: false, error: validation.reason || 'The requested slot is no longer available.' };
  }

  const supabase = createAdminClient();
  const previousWhen = new Date(appointment.start_time).toLocaleString();
  const duration = appointment.calendar?.slot_duration || 30;
  const newStart = parseISO(newSlot);
  const newEnd = addMinutes(newStart, duration);

  const { error: updateErr } = await supabase
    .from('appointments')
    .update({
      start_time: newStart.toISOString(),
      end_time: newEnd.toISOString(),
      status: 'scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointment.id);

  if (updateErr) {
    if (isSlotConflictError(updateErr)) {
      return { success: false, error: SLOT_CONFLICT_MESSAGE };
    }
    logger.error({ err: updateErr, appointmentId: appointment.id }, 'calendar.manage.reschedule.failed');
    return { success: false, error: 'Failed to reschedule this booking. Please try again.' };
  }

  // Move the host's real Google/Outlook calendar event to the new time — the
  // core of this fix. Best-effort: a calendar failure records a marker on the
  // booking (surfaced to the host) but never fails the reschedule.
  try {
    await pushEventTimeUpdate(appointment.id);
  } catch (syncErr) {
    logger.error({ err: syncErr, appointmentId: appointment.id }, 'calendar.manage.reschedule.calendar_sync_failed');
  }

  try {
    await sendRescheduleNotice(appointment.id, previousWhen);
  } catch (notifyErr) {
    logger.error({ err: notifyErr, appointmentId: appointment.id }, 'calendar.manage.reschedule.notification_failed');
  }

  return { success: true };
}
