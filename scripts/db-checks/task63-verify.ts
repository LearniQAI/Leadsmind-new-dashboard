/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { randomUUID } from 'crypto';

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { resolveMeetingLink } = await import('../../src/lib/calendar/meetingLink');
  const { storeCalendarConnection, deleteCalendarConnection } = await import('../../src/lib/calendar/connections');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const results: Array<[string, boolean]> = [];
  const check = (name: string, pass: boolean, detail = '') => {
    results.push([name, pass]);
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };
  const looksFake = (link: string | null) =>
    !!link && (/meet\.google\.com\/[a-z0-9-]+$/i.test(link) || /zoom\.us\/j\//i.test(link)) && !link.includes('/meet/');

  const { data: authUser } = await db.auth.admin.createUser({
    email: `t63-${runId}@example.com`,
    password: randomUUID(),
    email_confirm: true,
  });
  const ownerId = authUser!.user!.id;
  const realFetch = globalThis.fetch;

  let workspaceId = '';
  const calId = randomUUID();
  const aptIds: string[] = [];

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `T63 ${runId}`, slug: `t63-${runId}`,
      calendar_type: 'personal', timezone: 'UTC', slot_duration: 30, meeting_mode: 'google_meet',
    });

    let hour = 9;
    const mkApt = async (mode: string) => {
      hour += 1; // distinct slot per appointment — avoid the double-booking exclusion constraint
      const { data, error } = await db.from('appointments').insert({
        workspace_id: workspaceId, calendar_id: calId, title: `T63 ${mode} ${runId}`,
        start_time: `2026-11-02T${String(hour).padStart(2, '0')}:00:00Z`,
        end_time: `2026-11-02T${String(hour).padStart(2, '0')}:30:00Z`,
        status: 'scheduled', meeting_mode: mode, metadata: {},
      }).select().single();
      if (error || !data) throw error || new Error('appointment insert returned nothing');
      aptIds.push(data.id);
      return data;
    };

    // 1. zoom — must NEVER get a zoom.us link
    const zoomApt = await mkApt('zoom');
    const zoom = await resolveMeetingLink({
      appointmentId: zoomApt.id, requestedMode: 'zoom', hostUserId: null, workspaceId,
      calendarCustomLink: null, title: zoomApt.title, startTime: zoomApt.start_time, endTime: zoomApt.end_time,
    });
    check('zoom: meetingLink is null (no fabricated zoom.us URL)', zoom.meetingLink === null && !looksFake(zoom.meetingLink));
    check('zoom: status = zoom_pending_integration', zoom.status === 'zoom_pending_integration', zoom.status);

    // 2. google_meet, host NOT connected -> real internal room, honest status
    const g1Apt = await mkApt('google_meet');
    const g1 = await resolveMeetingLink({
      appointmentId: g1Apt.id, requestedMode: 'google_meet', hostUserId: ownerId, workspaceId,
      calendarCustomLink: null, title: g1Apt.title, startTime: g1Apt.start_time, endTime: g1Apt.end_time,
    });
    check('google_meet (not connected): real /meet/[id] link, NOT a fake meet.google.com URL',
      g1.meetingLink === `${appUrl}/meet/${g1Apt.id}` && !looksFake(g1.meetingLink), g1.meetingLink || '');
    check('google_meet (not connected): status = google_meet_pending_connection', g1.status === 'google_meet_pending_connection', g1.status);

    // 3. google_meet, host connected + Google API returns a real conference link (HTTP faked — real OAuth is manual QA)
    await storeCalendarConnection({
      workspaceId, userId: ownerId, provider: 'google',
      accessToken: 't63-at', refreshToken: 't63-rt', expiresAt: Date.now() + 3600_000,
      email: `connected-${runId}@gmail.com`, scope: 'calendar.events',
    });
    globalThis.fetch = (async (url: any, init?: any) => {
      const u = String(url);
      if (u.includes('oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'fresh', expires_in: 3600 }), { status: 200 });
      if (u.includes('calendar/v3/calendars/primary/events')) {
        return new Response(JSON.stringify({
          id: 'evt1', conferenceData: { entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/real-live-room' }] },
        }), { status: 200 });
      }
      return realFetch(url, init);
    }) as typeof fetch;

    const g2Apt = await mkApt('google_meet');
    const g2 = await resolveMeetingLink({
      appointmentId: g2Apt.id, requestedMode: 'google_meet', hostUserId: ownerId, workspaceId,
      calendarCustomLink: null, title: g2Apt.title, startTime: g2Apt.start_time, endTime: g2Apt.end_time,
    });
    check('google_meet (connected): a REAL Google Meet link is returned', g2.meetingLink === 'https://meet.google.com/real-live-room', g2.meetingLink || '');
    check('google_meet (connected): status = google_meet, mode persisted = google_meet', g2.status === 'google_meet' && g2.meetingMode === 'google_meet');

    // 4. google_meet, connected but API 500s -> honest fallback, never a fake link
    globalThis.fetch = (async (url: any, init?: any) => {
      const u = String(url);
      if (u.includes('oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'fresh', expires_in: 3600 }), { status: 200 });
      if (u.includes('calendar/v3/calendars/primary/events')) return new Response('err', { status: 500 });
      return realFetch(url, init);
    }) as typeof fetch;
    const g3Apt = await mkApt('google_meet');
    const g3 = await resolveMeetingLink({
      appointmentId: g3Apt.id, requestedMode: 'google_meet', hostUserId: ownerId, workspaceId,
      calendarCustomLink: null, title: g3Apt.title, startTime: g3Apt.start_time, endTime: g3Apt.end_time,
    });
    check('google_meet (API failed): falls back to real /meet/[id], status google_meet_unavailable, NO fake link',
      g3.meetingLink === `${appUrl}/meet/${g3Apt.id}` && g3.status === 'google_meet_unavailable' && !looksFake(g3.meetingLink));

    globalThis.fetch = realFetch;

    // 5. internal_meet regression
    const iApt = await mkApt('internal_meet');
    const internal = await resolveMeetingLink({
      appointmentId: iApt.id, requestedMode: 'internal_meet', hostUserId: null, workspaceId,
      calendarCustomLink: null, title: iApt.title, startTime: iApt.start_time, endTime: iApt.end_time,
    });
    check('internal_meet: unchanged real /meet/[id] room', internal.meetingLink === `${appUrl}/meet/${iApt.id}` && internal.status === 'internal');

    // 6. Persistence round-trip: store a resolution the way the booking actions
    //    do, read the row back — confirm no fake link ever lands in the DB.
    await db.from('appointments').update({
      meeting_link: zoom.meetingLink, meeting_mode: zoom.meetingMode,
      metadata: { meeting_link_status: zoom.status },
    }).eq('id', zoomApt.id);
    const { data: persisted } = await db.from('appointments')
      .select('meeting_link, meeting_mode, metadata').eq('id', zoomApt.id).single();
    check('persisted zoom booking: meeting_link stays null, status recorded in metadata',
      persisted!.meeting_link === null && (persisted!.metadata as any)?.meeting_link_status === 'zoom_pending_integration');

    await deleteCalendarConnection(workspaceId, ownerId, 'google');
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (workspaceId) {
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId);
      await db.from('booking_calendars').delete().eq('id', calId);
    }
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
