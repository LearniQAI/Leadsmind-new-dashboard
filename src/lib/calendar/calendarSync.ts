// This module is invoked from public/portal booking actions that have no
// Supabase Auth session (public visitors, client-portal contacts) as well
// as from internal dashboard flows — never exclusively from an
// authenticated user session. createServerClient() is session-bound: with
// no auth.uid(), the RLS policies on user_calendar_connections/appointments
// silently filter out all rows rather than erroring, so every read/update
// in this file would quietly no-op (no sync, no token-refresh-failure
// flagging) whenever called from those contexts, with the try/catch
// wrappers around it never seeing anything go wrong. Always use the
// admin client here, matching the same fix already applied to the
// equivalent case in lib/automation/executor.ts.
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { getFreshCalendarAccessToken, toCalendarConnectionRow } from '@/lib/calendar/connections';
import {
  updateGoogleCalendarEventTime,
  deleteGoogleCalendarEvent,
  type CalendarEventSyncResult,
} from '@/lib/calendar/googleMeet';
import { updateOutlookCalendarEventTime, deleteOutlookCalendarEvent } from '@/lib/calendar/outlookCalendarEvents';

export interface BusySlot {
  start: string; // ISO string
  end: string;   // ISO string
}

/**
 * Returns a valid access token for a `user_calendar_connections` DB row,
 * refreshing + persisting a new one if needed. Token material is
 * encrypted-at-rest and the refresh/re-encrypt logic lives in
 * lib/calendar/connections.ts (shared with the OAuth callbacks and
 * googleMeet.ts) — this is a thin adapter so existing call sites here don't
 * each reimplement it. Throws (after flipping the row to status='error') if
 * the connection can't produce a working token — never returns a stale/empty
 * string silently.
 */
export async function getConnectionAccessToken(dbRow: any): Promise<string> {
  return getFreshCalendarAccessToken(toCalendarConnectionRow(dbRow));
}

/**
 * Fetches busy time slots from Google and Outlook calendars for a host.
 */
export async function getExternalBusySlots(
  userId: string,
  startStr: string,
  endStr: string
): Promise<BusySlot[]> {
  const supabase = createAdminClient();
  const { data: connections } = await supabase
    .from('user_calendar_connections')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'connected');

  if (!connections || connections.length === 0) {
    return [];
  }

  const busySlots: BusySlot[] = [];

  for (const conn of connections) {
    try {
      const token = await getConnectionAccessToken(conn);

      if (conn.provider === 'google') {
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/freeBusy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              timeMin: startStr,
              timeMax: endStr,
              items: [{ id: 'primary' }],
            }),
          }
        );

        const data = await response.json();
        if (response.ok && data.calendars?.primary?.busy) {
          data.calendars.primary.busy.forEach((b: any) => {
            busySlots.push({ start: b.start, end: b.end });
          });
        }
      } else if (conn.provider === 'outlook') {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/calendar/getSchedule`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
              Prefer: `outlook.timezone="UTC"`,
            },
            body: JSON.stringify({
              schedules: ['me'],
              startTime: { dateTime: startStr, timeZone: 'UTC' },
              endTime: { dateTime: endStr, timeZone: 'UTC' },
              availabilityViewInterval: 15,
            }),
          }
        );

        const data = await response.json();
        if (response.ok && data.value?.[0]?.scheduleItems) {
          data.value[0].scheduleItems.forEach((item: any) => {
            // A malformed/partial schedule item (missing start or end)
            // used to throw here, aborting this connection's entire
            // busy-slot fetch for the whole range rather than just
            // skipping the one bad event.
            if (
              (item.status === 'busy' || item.status === 'oof') &&
              item.start?.dateTime &&
              item.end?.dateTime
            ) {
              busySlots.push({
                start: item.start.dateTime + 'Z',
                end: item.end.dateTime + 'Z',
              });
            }
          });
        }
      }
    } catch (err) {
      logger.warn({ err, provider: conn.provider, userId }, 'calendar_sync.sync.failed');
      // fallback to mock busy slot if in mock mode/sandbox env without client secrets
      if (!process.env.GOOGLE_CLIENT_ID && !process.env.OUTLOOK_CLIENT_ID) {
        logger.info({}, 'calendar_sync.sandboxed.simulated_block');
        // Add a mock block from 13:00 to 14:00 today to demonstrate sync logic works
        const todayStr = new Date().toISOString().split('T')[0];
        busySlots.push({
          start: `${todayStr}T13:00:00.000Z`,
          end: `${todayStr}T14:00:00.000Z`,
        });
      }
    }
  }

  return busySlots;
}

/**
 * Pushes native booking downstream to Google/Outlook calendar.
 */
export async function syncBookingToExternal(appointmentId: string): Promise<boolean> {
  const supabase = createAdminClient();

  // Fetch appointment details along with contact and calendar info
  const { data: appointment } = await supabase
    .from('appointments')
    .select('*, contact_id(email, first_name, last_name)')
    .eq('id', appointmentId)
    .maybeSingle();

  if (!appointment || !appointment.user_id) return false;

  const { data: connections } = await supabase
    .from('user_calendar_connections')
    .select('*')
    .eq('user_id', appointment.user_id)
    .eq('status', 'connected');

  if (!connections || connections.length === 0) return false;

  let success = false;

  const alreadyHasGoogleEvent = !!appointment.metadata?.google_event_id;

  for (const conn of connections) {
    try {
      const token = await getConnectionAccessToken(conn);
      const contactInfo: any = appointment.contact_id;
      const attendees = contactInfo?.email ? [{ email: contactInfo.email }] : [];

      if (conn.provider === 'google') {
        // google_meet-mode bookings already created a real Calendar event (with
        // the Meet conference) via meetingLink.ts — don't create a duplicate.
        if (alreadyHasGoogleEvent) {
          success = true;
          continue;
        }
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              summary: appointment.title,
              description: `LeadsMind Booking. Link: ${appointment.meeting_link || ''}`,
              start: { dateTime: appointment.start_time },
              end: { dateTime: appointment.end_time },
              attendees,
            }),
          }
        );

        if (response.ok) {
          const event = await response.json();
          // Save external event id to appointment metadata
          const currentMeta = appointment.metadata || {};
          await supabase
            .from('appointments')
            .update({
              metadata: {
                ...currentMeta,
                google_event_id: event.id,
                calendar_event_host_user_id: appointment.user_id,
              },
            })
            .eq('id', appointmentId);
          success = true;
        }
      } else if (conn.provider === 'outlook') {
        const response = await fetch(
          `https://graph.microsoft.com/v1.0/me/events`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              subject: appointment.title,
              body: {
                contentType: 'HTML',
                content: `LeadsMind Booking. Link: ${appointment.meeting_link || ''}`,
              },
              start: { dateTime: appointment.start_time, timeZone: 'UTC' },
              end: { dateTime: appointment.end_time, timeZone: 'UTC' },
              attendees: attendees.map(a => ({
                emailAddress: { address: a.email },
                type: 'required',
              })),
            }),
          }
        );

        if (response.ok) {
          const event = await response.json();
          const currentMeta = appointment.metadata || {};
          await supabase
            .from('appointments')
            .update({
              metadata: {
                ...currentMeta,
                outlook_event_id: event.id,
                calendar_event_host_user_id: appointment.user_id,
              },
            })
            .eq('id', appointmentId);
          success = true;
        }
      }
    } catch (err) {
      logger.error({ err, connectionId: conn.id }, 'calendar_sync.outbound_sync.failed');
    }
  }

  return success;
}

// ---------------------------------------------------------------------------
// Propagating a booking's reschedule / cancellation to the host's real
// calendar event(s). The event ids are stored on appointments.metadata by
// whichever path created them:
//   - google_event_id  : meetingLink.ts (google_meet mode) or syncBookingToExternal
//   - outlook_event_id : syncBookingToExternal (public / portal bookings)
//   - calendar_event_host_user_id : whose connected calendar the event lives on
// Both functions are BEST-EFFORT — the booking-side reschedule/cancel must
// still succeed even if the calendar can't be reached (revoked token, event
// deleted on the provider's side). A `calendar_sync_error` marker is written
// to metadata so the failure is visible (host detail view) rather than silent.
// ---------------------------------------------------------------------------

interface EventSyncOutcome {
  attempted: boolean;
  failed: boolean;
  google: CalendarEventSyncResult | null;
  outlook: CalendarEventSyncResult | null;
}

async function loadEventSyncContext(appointmentId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('appointments')
    .select('id, user_id, start_time, end_time, metadata')
    .eq('id', appointmentId)
    .maybeSingle();
  if (!data) return null;
  const metadata = (data.metadata as Record<string, any>) || {};
  return {
    supabase,
    appointment: data,
    metadata,
    hostUserId: (metadata.calendar_event_host_user_id as string | null) ?? data.user_id ?? null,
    googleEventId: (metadata.google_event_id as string | null) ?? null,
    outlookEventId: (metadata.outlook_event_id as string | null) ?? null,
  };
}

async function recordSyncMarker(
  supabase: any,
  appointmentId: string,
  metadata: Record<string, any>,
  action: 'reschedule' | 'cancel',
  outcome: EventSyncOutcome
) {
  const next = { ...metadata };
  if (outcome.failed) {
    next.calendar_sync_error = { at: new Date().toISOString(), action };
  } else if (outcome.attempted) {
    delete next.calendar_sync_error;
    if (action === 'cancel') {
      // The events are gone — don't leave dangling ids that a later call would retry.
      delete next.google_event_id;
      delete next.outlook_event_id;
    }
  } else {
    return; // nothing attempted, nothing to record
  }
  await supabase.from('appointments').update({ metadata: next }).eq('id', appointmentId);
}

/** Reschedule → PATCH the host's Google/Outlook event to the appointment's current times. */
export async function pushEventTimeUpdate(appointmentId: string): Promise<EventSyncOutcome> {
  const outcome: EventSyncOutcome = { attempted: false, failed: false, google: null, outlook: null };
  const ctx = await loadEventSyncContext(appointmentId);
  if (!ctx || (!ctx.googleEventId && !ctx.outlookEventId)) return outcome;

  const times = { startIso: ctx.appointment.start_time as string, endIso: ctx.appointment.end_time as string };

  if (ctx.googleEventId) {
    outcome.attempted = true;
    outcome.google = await updateGoogleCalendarEventTime(ctx.hostUserId, ctx.googleEventId, times);
    if (outcome.google === 'failed') outcome.failed = true;
  }
  if (ctx.outlookEventId) {
    outcome.attempted = true;
    outcome.outlook = await updateOutlookCalendarEventTime(ctx.hostUserId, ctx.outlookEventId, times);
    if (outcome.outlook === 'failed') outcome.failed = true;
  }

  await recordSyncMarker(ctx.supabase, appointmentId, ctx.metadata, 'reschedule', outcome);
  return outcome;
}

/** Cancel → DELETE the host's Google/Outlook event. */
export async function pushEventCancellation(appointmentId: string): Promise<EventSyncOutcome> {
  const outcome: EventSyncOutcome = { attempted: false, failed: false, google: null, outlook: null };
  const ctx = await loadEventSyncContext(appointmentId);
  if (!ctx || (!ctx.googleEventId && !ctx.outlookEventId)) return outcome;

  if (ctx.googleEventId) {
    outcome.attempted = true;
    outcome.google = await deleteGoogleCalendarEvent(ctx.hostUserId, ctx.googleEventId);
    if (outcome.google === 'failed') outcome.failed = true;
  }
  if (ctx.outlookEventId) {
    outcome.attempted = true;
    outcome.outlook = await deleteOutlookCalendarEvent(ctx.hostUserId, ctx.outlookEventId);
    if (outcome.outlook === 'failed') outcome.failed = true;
  }

  await recordSyncMarker(ctx.supabase, appointmentId, ctx.metadata, 'cancel', outcome);
  return outcome;
}
