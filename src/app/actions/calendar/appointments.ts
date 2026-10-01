'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { validateSlot, getRoundRobinAssignee, getAvailableSlots } from './scheduling';
import { createSupportTicket } from '@/lib/calendar/crossConnect';
import { logger } from '@/shared/logger';
import { NotFoundError, ValidationError, toClientError } from '@/shared/errors/AppError';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE, isResourceConflictError, RESOURCE_CONFLICT_MESSAGE } from '@/lib/calendar/bookingErrors';
import { sendBookingConfirmation } from '@/lib/calendar/notifications';
import { resolveMeetingLink, applyResolvedMeetingLink } from '@/lib/calendar/meetingLink';
import { pushEventCancellation, pushEventTimeUpdate } from '@/lib/calendar/calendarSync';
import { cancelGroupSession } from '@/lib/calendar/waitlist';

// A group session (Class or Webinar) carries per-attendee records. When staff
// cancel or delete such a session, every attendee (and anyone waitlisted) must
// be notified and their records marked cancelled — cancelGroupSession does that
// and makes NO waitlist offers (nothing is available).
async function notifyGroupSessionCancellation(supabase: any, appointmentId: string, workspaceId: string) {
  const { data: apt } = await supabase
    .from('appointments')
    .select('id, max_attendees')
    .eq('id', appointmentId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (apt && (apt.max_attendees ?? 1) > 1) {
    try {
      await cancelGroupSession(appointmentId);
    } catch (err) {
      logger.error({ err, appointmentId }, 'calendar.appointment.group_cancel.notify_failed');
    }
  }
}

// Previously read the workspaceId straight off the active_workspace_id cookie
// (getCurrentWorkspaceId()) with no auth check at all — this wrapper never
// called supabase.auth.getUser(), so every function below accepted any
// caller with a non-empty cookie value, member or not. Fixed here as part of
// this Priority 0 pass (not deferred to the Priority 3 executeAction() sweep
// mentioned in the triage) by switching to the shared requireWorkspaceAccess()
// helper, which both authenticates the caller and verifies real
// workspace_members row before any of these actions run.
async function executeAction<T>(action: (supabase: any, workspaceId: string) => Promise<T>) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();

    const supabase = await createServerClient();
    const data = await action(supabase, workspaceId);
    return { success: true, data };
  } catch (err: any) {
    logger.error({ err }, 'calendar.appointment_action.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONFIRMATION_WAIT_MS = 8000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function findByOperationId(supabase: any, workspaceId: string, operationId: string) {
  const { data } = await supabase
    .from('appointments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('client_operation_id', operationId)
    .maybeSingle();
  return data ?? null;
}

/**
 * Bookable start times for one calendar on one calendar-local date, for the staff booking dialog.
 * The list is exactly what validateSlot() will accept on submit (same generator), so a time the
 * user can pick is a time the server will take. `timezone` is the calendar's IANA zone: every
 * slot's `timeLabel` is rendered in it, and the dialog shows it explicitly.
 */
export async function getStaffBookableSlots(calendarId: string, date: string) {
  return executeAction(async (supabase, workspaceId) => {
    if (!UUID_RE.test(calendarId ?? '') || !DATE_RE.test(date ?? '')) {
      throw new ValidationError('Choose a calendar and a date.');
    }
    const { data: calendar } = await supabase
      .from('booking_calendars')
      .select('timezone, slot_duration')
      .eq('id', calendarId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!calendar) throw new NotFoundError('Calendar');

    const slots = await getAvailableSlots(calendarId, date);
    return {
      timezone: (calendar.timezone as string) || 'UTC',
      slotDuration: (calendar.slot_duration as number) || 30,
      slots: (slots as any[]).map((s) => ({
        start: s.start as string,
        end: s.end as string,
        timeLabel: s.timeLabel as string,
      })),
    };
  });
}

export async function getAppointments() {
  return executeAction(async (supabase, workspaceId) => {
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        contact:contacts(first_name, last_name, email),
        calendar:booking_calendars(name, calendar_type, price),
        resource:resources(name, type, location)
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
  /** Task 71 — an optional room/desk/equipment reserved for this exact slot. */
  resourceId?: string | null;
  /**
   * One UUID per booking-dialog open. A replay (double-click, retry after a timeout) with the same
   * id returns the original appointment instead of creating a second one. Enforced by
   * UNIQUE (workspace_id, client_operation_id).
   */
  clientOperationId?: string | null;
}) {
  return executeAction(async (supabase, workspaceId) => {
    // 0. Idempotency. Checked BEFORE slot validation: on a replay the original booking now occupies
    // the slot, so validating again would wrongly report a conflict with itself.
    const operationId = payload.clientOperationId ?? null;
    if (operationId !== null && !UUID_RE.test(operationId)) {
      throw new ValidationError('Invalid booking request. Please close and reopen the dialog.');
    }
    if (operationId) {
      const replay = await findByOperationId(supabase, workspaceId, operationId);
      if (replay) return replay;
    }

    // A contact id from the browser is untrusted: '' (no contact picked) must become NULL — a ''
    // uuid is a Postgres 22P02 — and a real id must belong to THIS workspace.
    const contactId = payload.contactId || null;
    if (contactId) {
      if (!UUID_RE.test(contactId)) throw new ValidationError('Invalid contact.');
      const { data: contactRow } = await supabase
        .from('contacts')
        .select('id')
        .eq('id', contactId)
        .eq('workspace_id', workspaceId)
        .maybeSingle();
      if (!contactRow) throw new ValidationError('That contact no longer exists. Please pick another.');
    }

    // 1. Fetch Calendar Metadata — scoped to the verified workspace so a
    // caller can't attach an appointment to another workspace's calendar by
    // supplying a calendarId that belongs elsewhere.
    const { data: calendar, error: calError } = await supabase
      .from('booking_calendars')
      .select('calendar_type, meeting_mode, capacity, location, timezone')
      .eq('id', payload.calendarId)
      .eq('workspace_id', workspaceId)
      .single();

    if (calError || !calendar) throw new NotFoundError('Calendar');

    // 2. Determine Effective Meeting Mode (Override vs Default)
    const effectiveMode = payload.meetingMode || calendar.meeting_mode || 'internal_meet';
    
    // 3. Engine-Specific Logic
    let assigneeId: string | null = null;

    if (calendar.calendar_type === 'round_robin') {
      try {
        assigneeId = await getRoundRobinAssignee(payload.calendarId, workspaceId);
      } catch (rrErr) {
        // Empty pool (no hosts enrolled) — don't block the booking; create it
        // unassigned so an admin can assign it, and warn. Same graceful
        // degradation as the public / portal / paid paths.
        logger.warn({ err: rrErr, calendarId: payload.calendarId }, 'calendar.appointment.round_robin.no_hosts_enrolled');
      }
    }

    // 4. Meeting-link generation happens AFTER the insert (it needs the real
    //    appointment id for the internal room, and a real Google Meet link
    //    when the host has connected Google). See step 7 — no fabricated URLs.

    // 5. Validation Logic
    if (!payload.skipValidation) {
      const validation = await validateSlot(payload.calendarId, payload.startTime, payload.endTime);
      if (!validation.available) {
        throw new ValidationError(validation.reason);
      }
    }

    // 6. Insert Appointment
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        workspace_id: workspaceId,
        calendar_id: payload.calendarId,
        contact_id: contactId,
        client_operation_id: operationId,
        user_id: assigneeId,
        title: payload.title,
        start_time: payload.startTime,
        end_time: payload.endTime,
        meeting_link: null,
        meeting_mode: effectiveMode,
        resource_id: payload.resourceId || null,
        metadata: {
          ...(payload.metadata || {}),
          // The IANA zone the slot was booked in (the calendar's), stored explicitly so the time is never ambiguous.
          booking_timezone: calendar.timezone || 'UTC',
          engine_type: calendar.calendar_type,
          original_engine_mode: calendar.meeting_mode
        },
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) {
      // Two identical submits racing: the loser fails either the UNIQUE (workspace_id,
      // client_operation_id) constraint (23505) or — because both rows also claim the same slot —
      // the appointments_no_overlap exclusion (23P01), and Postgres reports whichever it checks
      // first. Either way, if a row with OUR operation id now exists, that is the winner of this
      // same submit: hand it back so both callers see one booking, not a bogus "slot taken".
      const errCode = (error as { code?: string }).code;
      if (operationId && (errCode === '23505' || errCode === '23P01')) {
        const winner = await findByOperationId(supabase, workspaceId, operationId);
        if (winner) return winner;
      }
      // Resource check first — a resource-conflict insert also fails the
      // calendar_id EXCLUDE constraint's WHERE clause the same way, but
      // Postgres only ever raises ONE violation (whichever constraint it hits
      // first), so isSlotConflictError() already excludes the resource case —
      // order here just keeps the two branches readable.
      if (isResourceConflictError(error)) throw new ValidationError(RESOURCE_CONFLICT_MESSAGE);
      if (isSlotConflictError(error)) throw new ValidationError(SLOT_CONFLICT_MESSAGE);
      throw error;
    }

    // 7. Resolve the real meeting link (never a fabricated one) — see
    //    lib/calendar/meetingLink.ts. google_meet => real Google Meet link or
    //    an honest LeadsMind-room fallback; zoom => null + a "coming soon"
    //    status; internal/custom => unchanged.
    const resolved = await resolveMeetingLink({
      appointmentId: data.id,
      requestedMode: effectiveMode,
      hostUserId: assigneeId,
      workspaceId,
      calendarCustomLink: calendar.location ?? null,
      title: data.title,
      startTime: data.start_time,
      endTime: data.end_time,
    });
    const resolvedMetadata = applyResolvedMeetingLink(data.metadata, resolved);
    await supabase
      .from('appointments')
      .update({
        meeting_link: resolved.meetingLink,
        meeting_mode: resolved.meetingMode,
        metadata: resolvedMetadata,
      })
      .eq('id', data.id)
      .eq('workspace_id', workspaceId);
    data.meeting_link = resolved.meetingLink;
    data.meeting_mode = resolved.meetingMode;
    data.metadata = resolvedMetadata;

    // 8. Notification Orchestration — real send, not just a log line (see
    // calendar.md Part B: this used to be a misleadingly-named log statement
    // with no actual dispatch). Best-effort: notification failure must not
    // fail an appointment creation that already succeeded.
    try {
      // Capped: the booking is already saved, so a slow email provider must not keep the dialog
      // spinning. The send keeps running after we stop waiting; a late failure is still logged.
      await Promise.race([
        sendBookingConfirmation(data.id, { reason: 'booked' }),
        new Promise<void>((resolve) => setTimeout(resolve, CONFIRMATION_WAIT_MS)),
      ]);
    } catch (notifyErr) {
      logger.error({ err: notifyErr, appointmentId: data.id }, 'calendar.appointment.confirmation_email.failed');
    }

    // (round-robin booking_count is incremented atomically inside getRoundRobinAssignee)

    // Auto-create Support Ticket if support calendar
    try {
      await createSupportTicket(data.id);
    } catch (supportErr) {
      logger.error({ err: supportErr, appointmentId: data.id }, 'calendar.appointment.support_ticket.failed');
    }

    if (data.contact_id) {
      try {
        const { publishEvent } = await import('@/lib/events/EventBus');
        publishEvent(workspaceId, 'appointment_booked', data.contact_id, { appointmentId: data.id }).catch(() => {});
      } catch (evtErr) {
        logger.error({ err: evtErr, appointmentId: data.id }, 'calendar.appointment.automation_trigger.failed');
      }
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

    if (error) {
      if (isResourceConflictError(error)) throw new ValidationError(RESOURCE_CONFLICT_MESSAGE);
      if (isSlotConflictError(error)) throw new ValidationError(SLOT_CONFLICT_MESSAGE);
      throw error;
    }

    if (payload.status === 'cancelled') {
      await notifyGroupSessionCancellation(supabase, id, workspaceId);
    }

    // Staff-side reschedule: keep the host's real Google Calendar event in sync
    // (best-effort — a calendar failure must not undo the booking change).
    if (payload.start_time || payload.end_time) {
      try {
        await pushEventTimeUpdate(id);
      } catch (syncErr) {
        logger.error({ err: syncErr, appointmentId: id }, 'calendar.appointment.update.calendar_sync_failed');
      }
    }

    revalidatePath('/calendar');
    return data;
  });
}

export async function deleteAppointment(id: string) {
  return executeAction(async (supabase, workspaceId) => {
    // Notify + cancel every attendee record before the row (and its FK rows) go.
    await notifyGroupSessionCancellation(supabase, id, workspaceId);

    // Cancel the host's Google Calendar event BEFORE deleting the row — the
    // event id lives in the row's metadata (best-effort; never blocks the delete).
    try {
      await pushEventCancellation(id);
    } catch (syncErr) {
      logger.error({ err: syncErr, appointmentId: id }, 'calendar.appointment.delete.calendar_sync_failed');
    }

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

// getMeetingRoomDetails/logParticipantJoin/logParticipantLeave are the /meet/[id]
// surface: a genuinely public, unauthenticated meeting-room page — any real
// participant (including guests with no account) needs to load it and log
// join/leave. There's no second caller-supplied value to bind these against;
// the appointment/log id itself (an unguessable UUID) is the capability that
// authorizes access, the same pattern already used elsewhere in this codebase
// for shipments.ts's HMAC-token guest flow. The admin client is used
// deliberately here (not a missing check) because the session-based client
// has no RLS policy granting anonymous SELECT on `appointments` at all —
// verified live that the previous session-based queries returned nothing for
// a true anonymous caller, which would have broken this page for real guests
// regardless of this security pass.
export async function getMeetingRoomDetails(id: string) {
  try {
    const supabase = createAdminClient();
    // This is served to ANYONE holding the link, so it returns only what the room shows: the
    // title, when it is, and the meeting mode. Deliberately NOT the contact (name/email), the
    // stored meeting_link, deal/user ids, metadata or anything else on the appointment row —
    // the UUID in the URL is a capability, not a secret, and links get forwarded.
    const { data, error } = await supabase
      .from('appointments')
      .select('id, title, start_time, end_time, meeting_mode')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    logger.error({ err, appointmentId: id }, 'calendar.appointment.get.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * Logs a WebRTC participant joining a video call room.
 */
export async function logParticipantJoin(
  appointmentId: string,
  participantName: string
) {
  try {
    const supabase = createAdminClient();
    const { data: apt } = await supabase
      .from('appointments')
      .select('workspace_id, contact:contacts(email)')
      .eq('id', appointmentId)
      .single();

    if (!apt) throw new NotFoundError('Appointment');

    // The attendee's email is resolved HERE, from the appointment's own contact, and is never
    // sent to (or accepted from) the browser: the room page no longer receives the contact's
    // details, and a client-supplied email would let anyone tag any CRM contact as "attended"
    // (logParticipantLeave matches the log's email to a contact).
    const contact: any = Array.isArray((apt as any).contact) ? (apt as any).contact[0] : (apt as any).contact;
    const participantEmail: string = contact?.email || 'attendee@leadsmind.com';
    const displayName = participantName.trim().slice(0, 100) || 'Workspace Attendee';

    const { data: log, error } = await supabase
      .from('meet_attendance_logs')
      .insert({

        workspace_id: apt.workspace_id,
        appointment_id: appointmentId,
        participant_name: displayName,
        participant_email: participantEmail,
        joined_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, logId: log.id };
  } catch (err: any) {
    logger.error({ err, appointmentId }, 'calendar.participant_join.log.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * Logs a WebRTC participant leaving a video call room and compiles duration.
 */
export async function logParticipantLeave(logId: string) {
  try {
    const supabase = createAdminClient();
    // Previously scoped by the active_workspace_id cookie (getCurrentWorkspaceId()),
    // which is meaningless for an anonymous meeting guest (no dashboard session,
    // no reason to have that cookie set to the right workspace at all) — this
    // silently no-op'd leave-logging for real anonymous participants. logId
    // alone is the correct capability: it's the id this exact client received
    // back from its own logParticipantJoin call moments earlier.
    const { data: log } = await supabase
      .from('meet_attendance_logs')
      .select('joined_at, workspace_id, participant_email')
      .eq('id', logId)
      .single();

    if (!log) throw new NotFoundError('Attendance log');

    const leftAt = new Date();
    const joinedAt = new Date(log.joined_at);
    const duration = Math.floor((leftAt.getTime() - joinedAt.getTime()) / 1000);

    await supabase
      .from('meet_attendance_logs')
      .update({
        left_at: leftAt.toISOString(),
        duration_seconds: duration
      })
      .eq('id', logId);

    // Real attendance (joined + left with a measurable duration) tags the matching
    // CRM contact, resolved by email — meet_attendance_logs has no contact_id column.
    if (log.participant_email && duration > 0) {
      const { data: matchedContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('workspace_id', log.workspace_id)
        .eq('email', log.participant_email.toLowerCase())
        .maybeSingle();
      if (matchedContact) {
        const { applyAutoTag } = await import('@/modules/tags/autoTagging/applySystemTag');
        applyAutoTag(log.workspace_id, 'contact', matchedContact.id, 'Webinar Attendee', true).catch(() => {});
      }
    }

    return { success: true };
  } catch (err: any) {
    logger.error({ err, logId }, 'calendar.participant_leave.log.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * Queries meeting metrics and paid consults billing sums for analytics reporting.
 */
export async function getMeetingAnalytics() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };

    const supabase = await createServerClient();

    // 1. Calculate no-shows, completed, cancelled counts
    const { data: appointments } = await supabase
      .from('appointments')
      .select('status, start_time, end_time, user_id')
      .eq('workspace_id', workspaceId);

    // 2. Query Revenue completed PayFast consultations
    const { data: invoices } = await supabase
      .from('invoices')
      .select('amount_paid')
      .eq('workspace_id', workspaceId)
      .eq('status', 'paid');

    const totalRevenue = (invoices || []).reduce((sum, inv) => sum + parseFloat(inv.amount_paid || '0'), 0);

    return {
      success: true,
      data: {
        appointments: appointments || [],
        totalRevenue
      }
    };
  } catch (err: any) {
    logger.error({ err }, 'calendar.meeting_analytics.fetch.failed');
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

/**
 * Creates an on-demand instant Jitsi meeting room.
 */
export async function createInstantMeeting(payload: { title?: string; durationMinutes?: number }) {
  return executeAction(async (supabase, workspaceId) => {
    const title = payload.title || 'Instant Meeting';
    const duration = payload.durationMinutes || 60;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    const { data, error } = await supabase
      .from('appointments')
      .insert({
        workspace_id: workspaceId,
        title,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        meeting_mode: 'internal_meet',
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;

    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_APP_URL || '');
      
    const { link: meetLink, eventId: meetEventId } = await import('@/lib/calendar/googleMeet').then(
      m => m.createGoogleMeetLink({ title: data.title, start_time: data.start_time, end_time: data.end_time })
    );
    const internalLink = meetLink || `${baseUrl}/meet/${data.id}`;
    const instantMeta = meetEventId
      ? { ...(data.metadata || {}), google_event_id: meetEventId }
      : data.metadata;

    const { data: updated, error: updateErr } = await supabase
      .from('appointments')
      .update({
        meeting_link: internalLink,
        ...(meetEventId ? { metadata: instantMeta } : {}),
      })
      .eq("id", data.id).eq("workspace_id", workspaceId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath('/calendar');
    return updated;
  });
}

