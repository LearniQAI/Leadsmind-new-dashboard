/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { randomUUID } from 'crypto';

// Reschedule / cancel → the host's REAL Google Calendar event follows.
// Only Google's HTTP is faked (real OAuth consent is manual QA) — but the fake
// stores event state, so we GET the event back after the PATCH and prove it
// shows the NEW time, exercising the exact real API request shape end to end.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { resolveMeetingLink, applyResolvedMeetingLink } = await import('../../src/lib/calendar/meetingLink');
  const { storeCalendarConnection, deleteCalendarConnection } = await import('../../src/lib/calendar/connections');
  const { generateManageToken } = await import('../../src/lib/calendar/manageToken');
  const { rescheduleAppointmentByToken, cancelAppointmentByToken } = await import('../../src/app/actions/calendar/manage');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };
  const sameInstant = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime();

  // ---- fake Google Calendar API (stores event state) ----
  const realFetch = globalThis.fetch;
  const events = new Map<string, any>();
  let tokenShouldFail = false;
  const installFake = () => {
    globalThis.fetch = (async (url: any, init?: any) => {
      const u = String(url);
      const method = (init?.method || 'GET').toUpperCase();
      if (u.includes('oauth2.googleapis.com/token')) {
        if (tokenShouldFail) return new Response(JSON.stringify({ error: 'invalid_grant', error_description: 'Token revoked' }), { status: 400 });
        return new Response(JSON.stringify({ access_token: 'fresh', expires_in: 3600 }), { status: 200 });
      }
      const evMatch = u.match(/calendar\/v3\/calendars\/primary\/events(?:\/([^?]+))?/);
      if (evMatch) {
        const id = evMatch[1] ? decodeURIComponent(evMatch[1]) : null;
        if (method === 'POST') {
          const body = JSON.parse(init.body);
          const newId = `evt-${runId}-${events.size}`;
          events.set(newId, { id: newId, start: body.start, end: body.end, status: 'confirmed' });
          return new Response(JSON.stringify({ id: newId, conferenceData: { entryPoints: [{ entryPointType: 'video', uri: `https://meet.google.com/${newId}` }] } }), { status: 200 });
        }
        if (method === 'PATCH' && id) {
          const ev = events.get(id);
          if (!ev) return new Response('not found', { status: 404 });
          const body = JSON.parse(init.body);
          ev.start = body.start ?? ev.start; ev.end = body.end ?? ev.end;
          return new Response(JSON.stringify(ev), { status: 200 });
        }
        if (method === 'DELETE' && id) {
          if (!events.has(id)) return new Response(null, { status: 404 });
          events.get(id).status = 'cancelled';
          return new Response(null, { status: 204 });
        }
        if (method === 'GET' && id) {
          const ev = events.get(id);
          return ev ? new Response(JSON.stringify(ev), { status: 200 }) : new Response('', { status: 404 });
        }
      }
      return realFetch(url, init);
    }) as typeof fetch;
  };

  const { data: authUser } = await db.auth.admin.createUser({ email: `trsc-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const calId = randomUUID();
  const aptIds: string[] = [];

  // helper: create a google_meet appointment + its real (faked) Google event, like Task 63's path
  const seedGoogleMeetBooking = async (startIso: string, endIso: string) => {
    const { data: apt, error: aptErr } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: calId, user_id: ownerId,
      title: `Reschedule-sync ${runId}`, start_time: startIso, end_time: endIso,
      status: 'scheduled', meeting_mode: 'google_meet', metadata: {},
    }).select().single();
    if (aptErr || !apt) throw aptErr || new Error('appointment insert returned nothing');
    aptIds.push(apt!.id);
    const resolved = await resolveMeetingLink({
      appointmentId: apt!.id, requestedMode: 'google_meet', hostUserId: ownerId, workspaceId,
      calendarCustomLink: null, title: apt!.title, startTime: startIso, endTime: endIso,
    });
    await db.from('appointments').update({
      meeting_link: resolved.meetingLink, meeting_mode: resolved.meetingMode,
      metadata: applyResolvedMeetingLink(apt!.metadata, resolved),
    }).eq('id', apt!.id);
    const { data: row } = await db.from('appointments').select('metadata, meeting_link').eq('id', apt!.id).single();
    return { id: apt!.id, eventId: row!.metadata?.google_event_id as string, meetingLink: row!.meeting_link };
  };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;
    const { error: calErr } = await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `TRSC ${runId}`, slug: `trsc-${runId}`,
      calendar_type: 'personal', timezone: 'UTC', slot_duration: 30, cancellation_window_hours: 24,
      availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
    });
    if (calErr) throw calErr;
    await storeCalendarConnection({
      workspaceId, userId: ownerId, provider: 'google',
      accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600_000, email: `c-${runId}@gmail.com`, scope: 's',
    });
    installFake();

    // future weekday slots (well past the 24h cancellation window, within 30d horizon)
    const wk = (offsetDays: number, hhmm: string) => {
      const d = new Date(Date.now() + offsetDays * 864e5);
      while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
      return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
    };

    // ---- 1. create ----
    const origStart = wk(8, '10:00'); const origEnd = wk(8, '10:30');
    const b1 = await seedGoogleMeetBooking(origStart, origEnd);
    check('real Google Calendar event created for the google_meet booking', !!b1.eventId && events.has(b1.eventId), b1.eventId);
    check('event stored at the ORIGINAL time', events.get(b1.eventId)?.start?.dateTime === origStart);
    check('meeting_link is a real Meet URL', /meet\.google\.com\//.test(b1.meetingLink || ''));

    // ---- 2. reschedule via the self-service flow — CORE PROOF ----
    const newStart = wk(9, '14:00');
    const res = await rescheduleAppointmentByToken(generateManageToken(b1.id), newStart);
    check('rescheduleAppointmentByToken succeeded', res.success === true, JSON.stringify(res));

    // query the event straight back through the (fake) Google Calendar GET endpoint
    const getRes = await globalThis.fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(b1.eventId)}`,
      { headers: { Authorization: 'Bearer x' } }
    );
    const evAfter = await getRes.json();
    check('★ the Google Calendar event now shows the NEW time (queried back via the events GET endpoint)', sameInstant(evAfter.start.dateTime, newStart), `${evAfter.start.dateTime} == ${newStart}`);
    const { data: aptAfter } = await db.from('appointments').select('start_time, metadata').eq('id', b1.id).single();
    check('booking row also moved to the new time', sameInstant(aptAfter!.start_time, newStart));
    check('no calendar_sync_error marker (sync succeeded)', !aptAfter!.metadata?.calendar_sync_error);

    // ---- 3. cancel via the self-service flow ----
    const b2 = await seedGoogleMeetBooking(wk(10, '11:00'), wk(10, '11:30'));
    const cancelRes = await cancelAppointmentByToken(generateManageToken(b2.id));
    check('cancelAppointmentByToken succeeded', cancelRes.success === true, JSON.stringify(cancelRes));
    check('★ the real Google Calendar event was DELETED', events.get(b2.eventId)?.status === 'cancelled');
    const { data: b2After } = await db.from('appointments').select('status, metadata').eq('id', b2.id).single();
    check('booking marked cancelled + google_event_id stripped from metadata', b2After!.status === 'cancelled' && !b2After!.metadata?.google_event_id);

    // ---- 4. revoked connection at reschedule time ----
    const b3 = await seedGoogleMeetBooking(wk(11, '09:30'), wk(11, '10:00'));
    // Simulate a connection whose refresh token has been revoked: force the
    // stored access token to look expired AND make the token endpoint reject.
    const { data: connRow } = await db.from('user_calendar_connections')
      .select('id, credentials').eq('workspace_id', workspaceId).eq('provider', 'google').single();
    await db.from('user_calendar_connections')
      .update({ credentials: { ...(connRow!.credentials as any), expires_at: Date.now() - 60_000 } })
      .eq('id', connRow!.id);
    tokenShouldFail = true;
    const res3 = await rescheduleAppointmentByToken(generateManageToken(b3.id), wk(12, '15:00'));
    tokenShouldFail = false;
    check('reschedule still SUCCEEDS even though the calendar sync could not run', res3.success === true, JSON.stringify(res3));
    const { data: b3After } = await db.from('appointments').select('start_time, metadata').eq('id', b3.id).single();
    check('booking row still moved to the new time', sameInstant(b3After!.start_time, wk(12, '15:00')));
    check('★ a calendar_sync_error marker is recorded (clear signal, not silent)', b3After!.metadata?.calendar_sync_error?.action === 'reschedule', JSON.stringify(b3After!.metadata?.calendar_sync_error));

    await deleteCalendarConnection(workspaceId, ownerId, 'google');
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (workspaceId) {
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId);
      await db.from('booking_calendars').delete().eq('id', calId);
    }
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up all test bookings + the fake calendar events were never real)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
