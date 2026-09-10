// Task 69 — Recurring / repeating meetings: the core engine.
//
// Model: OPTION B (materialised). One `recurring_series` row (RRULE = source of
// truth) + N real `appointments` rows generated eagerly. Occurrences are
// ordinary appointments, so the reminder + AI-brief crons, getAvailableSlots
// conflict scan, the appointments_no_overlap constraint, every calendar view
// and analytics keep working unchanged. See the migration + task doc.
//
// This module is deliberately NOT a "use server" file — its functions take an
// explicit { workspaceId, userId } (already authorised by the caller). The
// server-action wrappers live in app/actions/calendar/recurringMeetings.ts and
// do the requireWorkspaceAccess() check; the live verification script calls
// these directly with a real workspace id.

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath as _revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';
import { NotFoundError, ValidationError, toClientError } from '@/shared/errors/AppError';
import { isSlotConflictError } from '@/lib/calendar/bookingErrors';
import { getRoundRobinAssignee } from '@/app/actions/calendar/scheduling';
import { sendBookingConfirmation, sendCancellationNotice, sendRescheduleNotice } from '@/lib/calendar/notifications';
import {
  buildRRule,
  expandOccurrences,
  describeRecurrence,
  normaliseRecurrence,
  RecurrenceError,
  type RecurrenceInput,
} from '@/lib/calendar/recurrence';
import {
  createGoogleRecurringEvent,
  deleteGoogleCalendarEvent,
  updateGoogleCalendarEventTime,
  updateGoogleRecurringEventRule,
  cancelGoogleEventInstance,
  updateGoogleEventInstanceTime,
} from '@/lib/calendar/googleMeet';
import { getCalendarConnection } from '@/lib/calendar/connections';

export type RecurrenceScope = 'this' | 'following' | 'all';
export type RecurrenceScopeAction = 'cancel' | 'reschedule';

export interface CreateRecurringSeriesPayload {
  calendarId: string;
  contactId?: string | null;
  title: string;
  startTime: string; // ISO — first occurrence start
  endTime: string;   // ISO — first occurrence end
  meetingMode?: string;
  recurrence: RecurrenceInput;
}

// revalidatePath throws if called outside a request scope (e.g. the live
// verification script). The cache hint is best-effort, never load-bearing.
function revalidatePath(p: string) {
  try { _revalidatePath(p); } catch { /* not in a request */ }
}

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

async function resolveGoogleHostUserId(
  supabase: any,
  workspaceId: string,
  seriesHostUserId: string | null
): Promise<string | null> {
  if (seriesHostUserId) return seriesHostUserId;
  const { data } = await supabase.from('workspaces').select('owner_id').eq('id', workspaceId).maybeSingle();
  return data?.owner_id ?? null;
}

function parseFreq(rrule: string): 'daily' | 'weekly' | 'monthly' {
  const m = rrule.match(/FREQ=(DAILY|WEEKLY|MONTHLY)/i);
  const map: Record<string, 'daily' | 'weekly' | 'monthly'> = { DAILY: 'daily', WEEKLY: 'weekly', MONTHLY: 'monthly' };
  return map[(m?.[1] || 'WEEKLY').toUpperCase()];
}
function parseInterval(rrule: string): number {
  const m = rrule.match(/INTERVAL=(\d+)/i);
  return m ? Math.max(1, parseInt(m[1], 10)) : 1;
}

/**
 * Creates a recurring series: the series row, ONE Google recurring event, and
 * every occurrence as a real appointment. Partial success is honest — an
 * occurrence that collides with a pre-existing booking on the same calendar is
 * skipped (reported), the rest are created.
 */
export async function createRecurringSeriesCore(
  { workspaceId, userId }: { workspaceId: string; userId: string | null },
  payload: CreateRecurringSeriesPayload
) {
  try {
    const supabase = createAdminClient();

    // 1. Calendar (workspace-scoped so a caller can't attach to another tenant's calendar).
    const { data: calendar, error: calErr } = await supabase
      .from('booking_calendars')
      .select('id, calendar_type, meeting_mode, capacity, location, timezone')
      .eq('id', payload.calendarId)
      .eq('workspace_id', workspaceId)
      .single();
    if (calErr || !calendar) throw new NotFoundError('Calendar');

    const effectiveMode = payload.meetingMode || calendar.meeting_mode || 'internal_meet';
    const timezone = calendar.timezone || 'UTC';

    // 2. Recurrence → RRULE → concrete occurrence starts.
    let rrule: string;
    try {
      normaliseRecurrence(payload.recurrence);
      rrule = buildRRule(payload.recurrence);
    } catch (e) {
      if (e instanceof RecurrenceError) throw new ValidationError(e.message);
      throw e;
    }
    const durationMs = new Date(payload.endTime).getTime() - new Date(payload.startTime).getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) throw new ValidationError('Meeting end must be after its start.');
    const durationMinutes = Math.round(durationMs / 60000);

    const occurrenceStarts = expandOccurrences(payload.startTime, rrule);
    if (occurrenceStarts.length < 2) throw new ValidationError('This recurrence produces fewer than 2 meetings.');

    // 3. One host for the whole series.
    let hostUserId: string | null = null;
    if (calendar.calendar_type === 'round_robin') {
      try {
        hostUserId = await getRoundRobinAssignee(payload.calendarId, workspaceId);
      } catch (rrErr) {
        logger.warn({ err: rrErr, calendarId: payload.calendarId }, 'calendar.recurring.round_robin.no_hosts');
      }
    }

    // 4. Series row.
    const { data: series, error: seriesErr } = await supabase
      .from('recurring_series')
      .insert({
        workspace_id: workspaceId,
        calendar_id: payload.calendarId,
        host_user_id: hostUserId,
        contact_id: payload.contactId || null,
        title: payload.title,
        meeting_mode: effectiveMode,
        rrule,
        timezone,
        dtstart: new Date(payload.startTime).toISOString(),
        duration_minutes: durationMinutes,
        status: 'active',
        occurrence_count: 0,
        created_by: userId,
      })
      .select()
      .single();
    if (seriesErr || !series) throw seriesErr || new Error('Series insert failed');

    // 5. Insert each occurrence as a real appointment. Individually, so the
    //    appointments_no_overlap DB constraint catches a genuine collision with
    //    a pre-existing booking on this calendar per-occurrence.
    const created: any[] = [];
    const skipped: string[] = [];
    for (let i = 0; i < occurrenceStarts.length; i++) {
      const s = occurrenceStarts[i];
      const e = new Date(s.getTime() + durationMs);
      const { data: row, error: insErr } = await supabase
        .from('appointments')
        .insert({
          workspace_id: workspaceId,
          calendar_id: payload.calendarId,
          contact_id: payload.contactId || null,
          user_id: hostUserId,
          title: payload.title,
          start_time: s.toISOString(),
          end_time: e.toISOString(),
          meeting_link: null,
          meeting_mode: effectiveMode,
          status: 'scheduled',
          series_id: series.id,
          original_start_time: s.toISOString(),
          metadata: { engine_type: calendar.calendar_type, series_id: series.id, occurrence_index: i },
        })
        .select()
        .single();
      if (insErr) {
        if (isSlotConflictError(insErr)) {
          skipped.push(s.toISOString());
          continue;
        }
        // Hard failure mid-series — roll back so we don't leave a partial mess.
        await supabase.from('appointments').delete().eq('series_id', series.id);
        await supabase.from('recurring_series').delete().eq('id', series.id);
        throw insErr;
      }
      created.push(row);
    }
    if (created.length === 0) {
      await supabase.from('recurring_series').delete().eq('id', series.id);
      throw new ValidationError('Every occurrence of this recurrence conflicts with an existing booking.');
    }

    // 6. ONE shared meeting link for the whole series.
    let meetingLink: string | null = null;
    let meetingLinkStatus = 'none';
    let meetingMode = effectiveMode;
    let googleRecurringEventId: string | null = null;
    let externalHostUserId: string | null = null;

    const firstOcc = created[0];
    const lastOcc = created[created.length - 1];

    if (effectiveMode === 'google_meet') {
      const googleHostId = await resolveGoogleHostUserId(supabase, workspaceId, hostUserId);
      const connection = googleHostId ? await getCalendarConnection(googleHostId, 'google') : null;
      if (connection) {
        const { link, eventId } = await createGoogleRecurringEvent(
          { title: payload.title, start_time: firstOcc.start_time, end_time: firstOcc.end_time, timezone },
          rrule,
          googleHostId!
        );
        if (link) {
          meetingLink = link;
          meetingLinkStatus = 'google_meet';
          meetingMode = 'google_meet';
          googleRecurringEventId = eventId;
          externalHostUserId = eventId ? googleHostId : null;
        } else {
          meetingLink = `${appUrl()}/meet/${firstOcc.id}`;
          meetingLinkStatus = 'google_meet_unavailable';
          meetingMode = 'internal_meet';
        }
      } else {
        meetingLink = `${appUrl()}/meet/${firstOcc.id}`;
        meetingLinkStatus = 'google_meet_pending_connection';
        meetingMode = 'internal_meet';
      }
    } else if (effectiveMode === 'zoom') {
      meetingLink = null;
      meetingLinkStatus = 'zoom_pending_integration';
      meetingMode = 'zoom';
    } else if (effectiveMode === 'custom_link' && calendar.location) {
      meetingLink = calendar.location;
      meetingLinkStatus = 'custom';
      meetingMode = 'custom_link';
    } else if (effectiveMode === 'phone' || effectiveMode === 'in_person' || effectiveMode === 'client_choice') {
      meetingLink = effectiveMode === 'in_person' ? (calendar.location ?? null) : null;
      meetingLinkStatus = 'none';
      meetingMode = effectiveMode;
    } else {
      // internal_meet / custom_link-without-url / unknown → one shared LeadsMind room.
      meetingLink = `${appUrl()}/meet/${firstOcc.id}`;
      meetingLinkStatus = 'internal';
      meetingMode = 'internal_meet';
    }

    // 7. Stamp the shared link + series pointers onto every occurrence.
    for (const row of created) {
      await supabase
        .from('appointments')
        .update({
          meeting_link: meetingLink,
          meeting_mode: meetingMode,
          metadata: {
            ...(row.metadata || {}),
            meeting_link_status: meetingLinkStatus,
            series_id: series.id,
            ...(googleRecurringEventId
              ? { google_recurring_event_id: googleRecurringEventId, calendar_event_host_user_id: externalHostUserId }
              : {}),
          },
        })
        .eq('id', row.id);
    }

    // 8. Series row: final link + external event + counts.
    await supabase
      .from('recurring_series')
      .update({
        meeting_link: meetingLink,
        meeting_link_status: meetingLinkStatus,
        meeting_mode: meetingMode,
        google_recurring_event_id: googleRecurringEventId,
        external_host_user_id: externalHostUserId,
        occurrence_count: created.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', series.id);

    // 9. ONE confirmation email — the first occurrence, with a recurrence summary.
    const summary = `${describeRecurrence(rrule)} (through ${new Date(lastOcc.start_time).toISOString().slice(0, 10)})`;
    try {
      await sendBookingConfirmation(firstOcc.id, { reason: 'booked', recurrenceSummary: summary });
    } catch (err) {
      logger.error({ err, seriesId: series.id }, 'calendar.recurring.confirmation_email.failed');
    }

    // 10. Automation event once (first occurrence).
    if (payload.contactId) {
      try {
        const { publishEvent } = await import('@/lib/events/EventBus');
        publishEvent(workspaceId, 'appointment_booked', payload.contactId, {
          appointmentId: firstOcc.id,
          seriesId: series.id,
          recurring: true,
        }).catch(() => {});
      } catch { /* best-effort */ }
    }

    revalidatePath('/calendar');
    return {
      success: true as const,
      data: {
        seriesId: series.id,
        rrule,
        summary,
        occurrencesCreated: created.length,
        occurrencesSkipped: skipped.length,
        skippedStarts: skipped,
        meetingLink,
        meetingLinkStatus,
        googleRecurringEventId,
        firstAppointmentId: firstOcc.id,
      },
    };
  } catch (err: any) {
    logger.error({ err }, 'calendar.recurring.create.failed');
    return { success: false as const, error: toClientError(err).error };
  }
}

/**
 * The recurring-series equivalent of the single-meeting cancel / reschedule.
 *   this      — only this occurrence (an exception; rest of the series untouched)
 *   following — this occurrence and every later one (series truncated with UNTIL)
 *   all       — the whole series
 */
export async function updateRecurringScopeCore(
  workspaceId: string,
  params: {
    appointmentId: string;
    scope: RecurrenceScope;
    action: RecurrenceScopeAction;
    newStartTime?: string;
  }
) {
  try {
    const supabase = createAdminClient();

    const { data: apt } = await supabase
      .from('appointments')
      .select('id, series_id, start_time, end_time, status, workspace_id, original_start_time, max_attendees, current_attendee_count')
      .eq('id', params.appointmentId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!apt) throw new NotFoundError('Appointment');
    if (!apt.series_id) throw new ValidationError('This meeting is not part of a recurring series.');

    const { data: series } = await supabase
      .from('recurring_series')
      .select('*')
      .eq('id', apt.series_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!series) throw new NotFoundError('Recurring series');

    const googleHostId = await resolveGoogleHostUserId(
      supabase,
      workspaceId,
      series.external_host_user_id || series.host_user_id
    );
    const recEventId: string | null = series.google_recurring_event_id;
    const occurrenceAnchor = apt.original_start_time || apt.start_time;
    const nowIso = new Date().toISOString();

    if (params.action === 'reschedule' && !params.newStartTime) {
      throw new ValidationError('A new time is required to reschedule.');
    }

    // ---------------------------------------------------------------- THIS ONLY
    if (params.scope === 'this') {
      if (params.action === 'cancel') {
        await supabase
          .from('appointments')
          .update({ status: 'cancelled', is_exception: true, updated_at: nowIso })
          .eq('id', apt.id);
        if (recEventId) await cancelGoogleEventInstance(googleHostId, recEventId, occurrenceAnchor);
        try { await sendCancellationNotice(apt.id, new Date(apt.start_time).toLocaleString()); } catch { /* best-effort */ }
        revalidatePath('/calendar');
        return { success: true as const, data: { scope: 'this', action: 'cancel', affected: 1 } };
      }
      const newStart = new Date(params.newStartTime!);
      const newEnd = new Date(newStart.getTime() + series.duration_minutes * 60000);
      const previousWhen = new Date(apt.start_time).toLocaleString();
      const { error: updErr } = await supabase
        .from('appointments')
        .update({ start_time: newStart.toISOString(), end_time: newEnd.toISOString(), is_exception: true, status: 'scheduled', updated_at: nowIso })
        .eq('id', apt.id);
      if (updErr) {
        if (isSlotConflictError(updErr)) return { success: false as const, error: 'That time conflicts with an existing booking.' };
        throw updErr;
      }
      if (recEventId) {
        await updateGoogleEventInstanceTime(googleHostId, recEventId, occurrenceAnchor, {
          startIso: newStart.toISOString(),
          endIso: newEnd.toISOString(),
        });
      }
      try { await sendRescheduleNotice(apt.id, previousWhen); } catch { /* best-effort */ }
      revalidatePath('/calendar');
      return { success: true as const, data: { scope: 'this', action: 'reschedule', affected: 1 } };
    }

    const futureFilter = () =>
      supabase
        .from('appointments')
        .select('id, start_time, end_time, is_exception, contact_id')
        .eq('series_id', series.id)
        .eq('status', 'scheduled');

    // ------------------------------------------------------- THIS AND FOLLOWING
    if (params.scope === 'following') {
      if (params.action !== 'cancel') {
        throw new ValidationError('"This and following" reschedule is not supported yet — reschedule this occurrence, or the whole series.');
      }
      const { data: toCancel } = await futureFilter().gte('start_time', apt.start_time);
      const ids = (toCancel || []).map((r: any) => r.id);
      if (ids.length) {
        await supabase.from('appointments').update({ status: 'cancelled', updated_at: nowIso }).in('id', ids);
      }

      const { count: remaining } = await supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('series_id', series.id)
        .eq('status', 'scheduled');

      if ((remaining ?? 0) === 0) {
        await supabase.from('recurring_series').update({ status: 'cancelled', updated_at: nowIso }).eq('id', series.id);
        if (recEventId) await deleteGoogleCalendarEvent(googleHostId, recEventId);
      } else {
        const until = new Date(new Date(apt.start_time).getTime() - 1000).toISOString();
        let truncated = series.rrule;
        try {
          truncated = buildRRule({ frequency: parseFreq(series.rrule), interval: parseInterval(series.rrule), until });
        } catch { /* keep original on parse trouble */ }
        await supabase
          .from('recurring_series')
          .update({ rrule: truncated, occurrence_count: remaining ?? 0, updated_at: nowIso })
          .eq('id', series.id);
        if (recEventId) await updateGoogleRecurringEventRule(googleHostId, recEventId, truncated);
      }
      try { await sendCancellationNotice(apt.id, new Date(apt.start_time).toLocaleString()); } catch { /* best-effort */ }
      revalidatePath('/calendar');
      return { success: true as const, data: { scope: 'following', action: 'cancel', affected: ids.length } };
    }

    // -------------------------------------------------------------- ENTIRE SERIES
    if (params.action === 'cancel') {
      const { data: toCancel } = await futureFilter().gt('start_time', nowIso);
      const ids = (toCancel || []).map((r: any) => r.id);
      if (ids.length) {
        await supabase.from('appointments').update({ status: 'cancelled', updated_at: nowIso }).in('id', ids);
      }
      await supabase.from('recurring_series').update({ status: 'cancelled', updated_at: nowIso }).eq('id', series.id);
      if (recEventId) await deleteGoogleCalendarEvent(googleHostId, recEventId);
      try { await sendCancellationNotice(apt.id, new Date(apt.start_time).toLocaleString()); } catch { /* best-effort */ }
      revalidatePath('/calendar');
      return { success: true as const, data: { scope: 'all', action: 'cancel', affected: ids.length } };
    }

    // reschedule entire series — shift every future, non-exception occurrence by
    // the same delta as the selected occurrence; move the Google recurring
    // event's anchor by that delta.
    const deltaMs = new Date(params.newStartTime!).getTime() - new Date(apt.start_time).getTime();
    if (deltaMs === 0) return { success: true as const, data: { scope: 'all', action: 'reschedule', affected: 0 } };

    const { data: futureRows } = await futureFilter().gt('start_time', nowIso);
    let shifted = 0;
    for (const r of futureRows || []) {
      if (r.is_exception) continue;
      const ns = new Date(new Date(r.start_time).getTime() + deltaMs).toISOString();
      const ne = new Date(new Date(r.end_time).getTime() + deltaMs).toISOString();
      const { error: e } = await supabase.from('appointments').update({ start_time: ns, end_time: ne, updated_at: nowIso }).eq('id', r.id);
      if (!e) shifted++;
    }
    const newDtstart = new Date(new Date(series.dtstart).getTime() + deltaMs).toISOString();
    await supabase.from('recurring_series').update({ dtstart: newDtstart, updated_at: nowIso }).eq('id', series.id);
    if (recEventId) {
      await updateGoogleCalendarEventTime(googleHostId, recEventId, {
        startIso: newDtstart,
        endIso: new Date(new Date(newDtstart).getTime() + series.duration_minutes * 60000).toISOString(),
      });
    }
    try { await sendRescheduleNotice(apt.id, new Date(apt.start_time).toLocaleString()); } catch { /* best-effort */ }
    revalidatePath('/calendar');
    return { success: true as const, data: { scope: 'all', action: 'reschedule', affected: shifted } };
  } catch (err: any) {
    logger.error({ err }, 'calendar.recurring.scope_update.failed');
    return { success: false as const, error: toClientError(err).error };
  }
}

export async function getSeriesForAppointmentCore(workspaceId: string, appointmentId: string) {
  try {
    const supabase = createAdminClient();
    const { data: apt } = await supabase
      .from('appointments')
      .select('series_id')
      .eq('id', appointmentId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!apt?.series_id) return { success: true as const, data: null };

    const { data: series } = await supabase
      .from('recurring_series')
      .select('id, rrule, status, occurrence_count, meeting_link, meeting_link_status, timezone')
      .eq('id', apt.series_id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!series) return { success: true as const, data: null };

    const { data: occurrences } = await supabase
      .from('appointments')
      .select('id, start_time, end_time, status, is_exception')
      .eq('series_id', series.id)
      .order('start_time', { ascending: true });

    return {
      success: true as const,
      data: { ...series, summary: describeRecurrence(series.rrule), occurrences: occurrences || [] },
    };
  } catch (err: any) {
    return { success: false as const, error: toClientError(err).error };
  }
}
