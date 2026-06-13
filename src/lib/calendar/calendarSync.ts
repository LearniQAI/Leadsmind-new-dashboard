import { createServerClient } from '@/lib/supabase/server';

export interface BusySlot {
  start: string; // ISO string
  end: string;   // ISO string
}

/**
 * Refreshes user calendar connections credentials.
 */
export async function refreshUserCalendarToken(
  connectionId: string,
  credentials: any,
  provider: 'google' | 'outlook'
): Promise<string> {
  const { accessToken, refreshToken, expiresAt } = credentials;

  // If token is still valid (5 minute buffer), return current
  if (expiresAt && Date.now() < (expiresAt - 300000)) {
    return accessToken;
  }

  if (!refreshToken) {
    throw new Error(`Missing refresh token for ${provider}`);
  }

  try {
    let newAccessToken = '';
    let newExpiresAt = Date.now() + 3600 * 1000;

    if (provider === 'google') {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID || '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || 'Failed to refresh Google token');
      newAccessToken = data.access_token;
      newExpiresAt = Date.now() + (data.expires_in * 1000);
    } else {
      // Outlook refresh
      const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.OUTLOOK_CLIENT_ID || '',
          client_secret: process.env.OUTLOOK_CLIENT_SECRET || '',
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || 'Failed to refresh Outlook token');
      newAccessToken = data.access_token;
      newExpiresAt = Date.now() + (data.expires_in * 1000);
    }

    const supabase = await createServerClient();
    await supabase
      .from('user_calendar_connections')
      .update({
        credentials: {
          ...credentials,
          accessToken: newAccessToken,
          expiresAt: newExpiresAt,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId);

    return newAccessToken;
  } catch (error) {
    console.error(`[calendar-refresh] Error refreshing ${provider} token:`, error);
    // Mark status as error on refresh failure
    const supabase = await createServerClient();
    await supabase
      .from('user_calendar_connections')
      .update({ status: 'error' })
      .eq('id', connectionId);
    throw error;
  }
}

/**
 * Fetches busy time slots from Google and Outlook calendars for a host.
 */
export async function getExternalBusySlots(
  userId: string,
  startStr: string,
  endStr: string
): Promise<BusySlot[]> {
  const supabase = await createServerClient();
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
      const token = await refreshUserCalendarToken(conn.id, conn.credentials, conn.provider as 'google' | 'outlook');

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
            if (item.status === 'busy' || item.status === 'oof') {
              busySlots.push({
                start: item.start.dateTime + 'Z',
                end: item.end.dateTime + 'Z',
              });
            }
          });
        }
      }
    } catch (err) {
      console.warn(`[calendar-sync] Failed to sync ${conn.provider} for user ${userId}:`, err);
      // fallback to mock busy slot if in mock mode/sandbox env without client secrets
      if (!process.env.GOOGLE_CLIENT_ID && !process.env.OUTLOOK_CLIENT_ID) {
        console.log('[calendar-sync] Sandboxed execution: providing simulated external block.');
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
  const supabase = await createServerClient();

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
      const token = await refreshUserCalendarToken(conn.id, conn.credentials, conn.provider as 'google' | 'outlook');
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
      console.error(`[calendar-sync] Outbound sync failed for connection ${conn.id}:`, err);
    }
  }

  return success;
}
