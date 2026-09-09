'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { validateSlot, getRoundRobinAssignee, updateRoundRobinStats } from './scheduling';
import { createSupportTicket } from '@/lib/calendar/crossConnect';
import { logger } from '@/shared/logger';
import { NotFoundError, ValidationError, toClientError } from '@/shared/errors/AppError';
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '@/lib/calendar/bookingErrors';
import { sendBookingConfirmation } from '@/lib/calendar/notifications';
import { resolveMeetingLink, applyResolvedMeetingLink } from '@/lib/calendar/meetingLink';
import { pushEventCancellation, pushEventTimeUpdate } from '@/lib/calendar/calendarSync';

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
    // 1. Fetch Calendar Metadata — scoped to the verified workspace so a
    // caller can't attach an appointment to another workspace's calendar by
    // supplying a calendarId that belongs elsewhere.
    const { data: calendar, error: calError } = await supabase
      .from('booking_calendars')
      .select('calendar_type, meeting_mode, capacity, location')
      .eq('id', payload.calendarId)
      .eq('workspace_id', workspaceId)
      .single();

    if (calError || !calendar) throw new NotFoundError('Calendar');

    // 2. Determine Effective Meeting Mode (Override vs Default)
    const effectiveMode = payload.meetingMode || calendar.meeting_mode || 'internal_meet';
    
    // 3. Engine-Specific Logic
    let assigneeId = null;

    if (calendar.calendar_type === 'round_robin') {
      assigneeId = await getRoundRobinAssignee(payload.calendarId, workspaceId);
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
        contact_id: payload.contactId,
        user_id: assigneeId,
        title: payload.title,
        start_time: payload.startTime,
        end_time: payload.endTime,
        meeting_link: null,
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

    if (error) {
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
      await sendBookingConfirmation(data.id, { reason: 'booked' });
    } catch (notifyErr) {
      logger.error({ err: notifyErr, appointmentId: data.id }, 'calendar.appointment.confirmation_email.failed');
    }

    // 9. Post-Insert Engine Updates
    if (calendar.calendar_type === 'round_robin' && assigneeId) {
      await updateRoundRobinStats(payload.calendarId, assigneeId);
    }

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

    if (error) throw error;

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

// getAppointmentById/logParticipantJoin/logParticipantLeave are the /meet/[id]
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
export async function getAppointmentById(id: string) {
  try {
    const supabase = createAdminClient();
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
  participantName: string,
  participantEmail: string
) {
  try {
    const supabase = createAdminClient();
    const { data: apt } = await supabase
      .from('appointments')
      .select('workspace_id')
      .eq('id', appointmentId)
      .single();

    if (!apt) throw new NotFoundError('Appointment');

    const { data: log, error } = await supabase
      .from('meet_attendance_logs')
      .insert({

        workspace_id: apt.workspace_id,
        appointment_id: appointmentId,
        participant_name: participantName,
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

