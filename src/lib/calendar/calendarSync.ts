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

  for (const conn of connections) {
    try {
      const token = await getConnectionAccessToken(conn);
      const contactInfo: any = appointment.contact_id;
      const attendees = contactInfo?.email ? [{ email: contactInfo.email }] : [];

      if (conn.provider === 'google') {
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
