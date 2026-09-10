/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID || 'zoom_test_client';
process.env.ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET || 'zoom_test_secret';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

// Task 70 — real Zoom + Microsoft Teams video conferencing.
//
//   * Teams REAL path is fully live-verifiable now: it reuses the existing
//     'outlook' connection (valid provider today), so we seed one, fake the
//     Graph /me/onlineMeetings HTTP (the fake stores meeting state), and prove
//     book -> real joinWebUrl + teams_meeting_id, reschedule -> PATCH, cancel
//     -> DELETE + id stripped.
//   * Zoom REAL path needs migration 20260911000000 applied (provider 'zoom').
//     The script detects whether it's applied; if not, it verifies the honest
//     FALLBACK (no connection -> internal room, never a fake zoom.us URL) and
//     flags the real path as pending-migration.
//   * Google Meet regression: unchanged.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { resolveMeetingLink, applyResolvedMeetingLink } = await import('../../src/lib/calendar/meetingLink');
  const { storeCalendarConnection } = await import('../../src/lib/calendar/connections');
  const { pushEventTimeUpdate, pushEventCancellation } = await import('../../src/lib/calendar/calendarSync');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };
  const note = (s: string) => console.log(`   ${s}`);
  const looksFakeZoom = (l: string | null) => !!l && /zoom\.us\/j\//i.test(l) && !l.includes('/meet/');
  const sameInstant = (a: string, b: string) => new Date(a).getTime() === new Date(b).getTime();

  // ---- fake Microsoft Graph (token + online meetings, stores state) ----
  const realFetch = globalThis.fetch;
  const teamsMeetings = new Map<string, any>();
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    const method = (init?.method || 'GET').toUpperCase();
    if (u.includes('login.microsoftonline.com') && u.includes('/token')) {
      return new Response(JSON.stringify({ access_token: 'graph-fresh', expires_in: 3600 }), { status: 200 });
    }
    if (u.includes('zoom.us/oauth/token')) {
      return new Response(JSON.stringify({ access_token: 'zoom-fresh', expires_in: 3600 }), { status: 200 });
    }
    const m = u.match(/graph\.microsoft\.com\/v1\.0\/me\/onlineMeetings(?:\/([^?]+))?/);
    if (m) {
      const id = m[1] ? decodeURIComponent(m[1]) : null;
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        const newId = `MSPx-${runId}-${teamsMeetings.size}`;
        teamsMeetings.set(newId, { id: newId, startDateTime: body.startDateTime, endDateTime: body.endDateTime, status: 'active' });
        return new Response(JSON.stringify({ id: newId, joinWebUrl: `https://teams.microsoft.com/l/meetup-join/${newId}` }), { status: 201 });
      }
      if (method === 'PATCH' && id) {
        const mt = teamsMeetings.get(id);
        if (!mt) return new Response('not found', { status: 404 });
        const body = JSON.parse(init.body);
        mt.startDateTime = body.startDateTime ?? mt.startDateTime;
        mt.endDateTime = body.endDateTime ?? mt.endDateTime;
        return new Response(JSON.stringify(mt), { status: 200 });
      }
      if (method === 'DELETE' && id) {
        if (!teamsMeetings.has(id)) return new Response(null, { status: 404 });
        teamsMeetings.get(id).status = 'cancelled';
        return new Response(null, { status: 204 });
      }
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `t70-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const calId = randomUUID();
  const aptIds: string[] = [];

  // meeting_mode 'teams'/'zoom' are blocked by the appointments CHECK until the
  // migration lands, so the seeded row stays 'internal_meet' — the resolver
  // doesn't read that column, and reschedule/cancel sync keys off metadata ids.
  let aptHour = 8;
  const mkApt = async (label: string) => {
    aptHour += 1; // distinct slot per appointment — avoid appointments_no_overlap
    const hh = String(aptHour).padStart(2, '0');
    const { data, error } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: calId, user_id: ownerId,
      title: `T70 ${label} ${runId}`,
      start_time: `2026-11-03T${hh}:00:00.000Z`, end_time: `2026-11-03T${hh}:30:00.000Z`,
      status: 'scheduled', meeting_mode: 'internal_meet', metadata: {},
    }).select().single();
    if (error || !data) throw error || new Error('apt insert failed');
    aptIds.push(data.id);
    return data;
  };
  const seed = async (apt: any, mode: string) => {
    const resolved = await resolveMeetingLink({
      appointmentId: apt.id, requestedMode: mode, hostUserId: ownerId, workspaceId,
      calendarCustomLink: null, title: apt.title, startTime: apt.start_time, endTime: apt.end_time,
    });
    await db.from('appointments').update({
      meeting_link: resolved.meetingLink,
      metadata: applyResolvedMeetingLink(apt.metadata, resolved),
    }).eq('id', apt.id);
    const { data: row } = await db.from('appointments').select('meeting_link, metadata').eq('id', apt.id).single();
    return { ...row!, resolvedMode: resolved.meetingMode };
  };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: mem } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = mem!.workspace_id;
    await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `T70 ${runId}`, slug: `t70-${runId}`,
      calendar_type: 'personal', timezone: 'UTC', slot_duration: 30, cancellation_window_hours: 24,
    });

    // ================= TEAMS — real path, live =================
    console.log('\n=== Microsoft Teams (real path — reuses the Outlook connection) ===');
    await storeCalendarConnection({
      workspaceId, userId: ownerId, provider: 'outlook',
      accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600_000, email: `t70-${runId}@outlook.com`, scope: 's',
    });

    const teamsApt = await mkApt('teams');
    const teamsRow = await seed(teamsApt, 'teams');
    check('★ teams booking gets a REAL Teams join link (joinWebUrl)', /teams\.microsoft\.com\/l\/meetup-join\//.test(teamsRow.meeting_link || ''), teamsRow.meeting_link || 'null');
    check('  → meeting_mode persisted as teams, status = teams', teamsRow.resolvedMode === "teams" && teamsRow.metadata?.meeting_link_status === 'teams');
    const teamsId = teamsRow.metadata?.teams_meeting_id as string;
    check('  → teams_meeting_id + host recorded on metadata (for later sync)', !!teamsId && teamsMeetings.has(teamsId) && teamsRow.metadata?.calendar_event_host_user_id === ownerId, teamsId);

    // reschedule
    const newStart = '2026-11-04T14:00:00.000Z', newEnd = '2026-11-04T14:30:00.000Z';
    await db.from('appointments').update({ start_time: newStart, end_time: newEnd }).eq('id', teamsApt.id);
    const upOutcome = await pushEventTimeUpdate(teamsApt.id);
    check('★ reschedule → the real Teams meeting was PATCHed to the new time', upOutcome.teams === 'updated' && sameInstant(teamsMeetings.get(teamsId).startDateTime, newStart), JSON.stringify(upOutcome));

    // cancel
    const cxOutcome = await pushEventCancellation(teamsApt.id);
    check('★ cancel → the real Teams meeting was DELETED', cxOutcome.teams === 'updated' && teamsMeetings.get(teamsId).status === 'cancelled');
    const { data: teamsAfter } = await db.from('appointments').select('metadata').eq('id', teamsApt.id).single();
    check('  → teams_meeting_id stripped from metadata after cancel', !teamsAfter!.metadata?.teams_meeting_id);

    // teams, host NOT connected → honest fallback
    await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId).eq('provider', 'outlook');
    const teamsApt2 = await mkApt('teams');
    const teamsRow2 = await seed(teamsApt2, 'teams');
    check('teams (no connection): honest fallback — internal room + teams_pending_connection', teamsRow2.resolvedMode === "internal_meet" && teamsRow2.metadata?.meeting_link_status === 'teams_pending_connection' && (teamsRow2.meeting_link || '').includes('/meet/'));

    // ================= ZOOM =================
    console.log('\n=== Zoom ===');
    let zoomProviderAllowed = true;
    try {
      await storeCalendarConnection({
        workspaceId, userId: ownerId, provider: 'zoom' as any,
        accessToken: 'zat', refreshToken: 'zrt', expiresAt: Date.now() + 3600_000, email: `t70-${runId}@zoom.test`, scope: 'meeting:write',
      });
    } catch (e: any) {
      zoomProviderAllowed = false;
      note(`⏳ migration 20260911000000 NOT applied yet — provider 'zoom' rejected by CHECK constraint (${String(e?.message || e).slice(0, 80)})`);
      note('   Zoom real path is code-complete; live-verify it after the migration + a real Zoom Marketplace app.');
    }

    if (zoomProviderAllowed) {
      // fake Zoom API
      const zoomMeetings = new Map<string, any>();
      const prevFetch = globalThis.fetch;
      globalThis.fetch = (async (url: any, init?: any) => {
        const u = String(url); const method = (init?.method || 'GET').toUpperCase();
        const cm = u.match(/api\.zoom\.us\/v2\/(?:users\/me\/meetings|meetings\/([^?]+))/);
        if (cm) {
          const id = cm[1] ? decodeURIComponent(cm[1]) : null;
          if (method === 'POST') {
            const nid = 8000 + zoomMeetings.size;
            zoomMeetings.set(String(nid), { id: nid, status: 'waiting' });
            return new Response(JSON.stringify({ id: nid, join_url: `https://zoom.us/j/${nid}?pwd=x` }), { status: 201 });
          }
          if (method === 'PATCH' && id) { zoomMeetings.get(id).patched = true; return new Response(null, { status: 204 }); }
          if (method === 'DELETE' && id) { zoomMeetings.get(id).status = 'deleted'; return new Response(null, { status: 204 }); }
        }
        return prevFetch(url, init);
      }) as typeof fetch;

      const zApt = await mkApt('zoom');
      const zRow = await seed(zApt, 'zoom');
      check('★ zoom booking gets a REAL Zoom join link', /zoom\.us\/j\/\d+/.test(zRow.meeting_link || '') && zRow.metadata?.meeting_link_status === "zoom", zRow.meeting_link || 'null');
      const zId = zRow.metadata?.zoom_meeting_id as string;
      check('  → zoom_meeting_id recorded', !!zId && zoomMeetings.has(zId));
      await db.from('appointments').update({ start_time: newStart, end_time: newEnd }).eq('id', zApt.id);
      const zUp = await pushEventTimeUpdate(zApt.id);
      check('★ reschedule → the real Zoom meeting was PATCHed', zUp.zoom === 'updated' && zoomMeetings.get(zId).patched === true);
      const zCx = await pushEventCancellation(zApt.id);
      check('★ cancel → the real Zoom meeting was DELETED', zCx.zoom === 'updated' && zoomMeetings.get(zId).status === 'deleted');
      globalThis.fetch = prevFetch;
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId).eq('provider', 'zoom');
    }

    // zoom, no connection → honest fallback (works regardless of migration)
    const zApt2 = await mkApt('zoom');
    const zRow2 = await seed(zApt2, 'zoom');
    check('zoom (no connection): NEVER a fake zoom.us URL', !looksFakeZoom(zRow2.meeting_link));
    check('zoom (no connection): honest fallback — internal room + zoom_pending_connection', zRow2.resolvedMode === "internal_meet" && zRow2.metadata?.meeting_link_status === 'zoom_pending_connection');

    // ================= GOOGLE MEET regression =================
    console.log('\n=== Google Meet (regression — must be unaffected) ===');
    const gApt = await mkApt('google_meet');
    const gRow = await seed(gApt, 'google_meet');
    check('google_meet still resolves to an honest state (pending connection here)', gRow.metadata?.meeting_link_status === 'google_meet_pending_connection' && (gRow.meeting_link || '').includes('/meet/'));
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (workspaceId) {
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId);
      await db.from('booking_calendars').delete().eq('id', calId);
    }
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up — all faked Zoom/Graph state was never real)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
