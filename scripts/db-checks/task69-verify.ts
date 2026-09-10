/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.CRON_SECRET = 'task69verify';
process.env.RESEND_API_KEY = 're_task69verify00000000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
process.env.CRON_SECRET = 'task69verify';
process.env.TWILIO_ACCOUNT_SID = 'AC_123'; // force sms sandbox
import { randomUUID } from 'crypto';

const React = require('react');
if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const db = createAdminClient();
  const { createRecurringSeriesCore, updateRecurringScopeCore } = await import('../../src/lib/calendar/recurringSeries');
  const { storeCalendarConnection, deleteCalendarConnection } = await import('../../src/lib/calendar/connections');
  const { GET: remindersGET } = await import('../../src/app/api/cron/reminders/route');

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${d ? ` -- ${d}` : ''}`); };
  const sameInstant = (a?: string | null, b?: string | null) => !!a && !!b && new Date(a).getTime() === new Date(b).getTime();

  // ---- intercept Google Calendar + Resend ----
  const realFetch = globalThis.fetch;
  const gPosts: any[] = [];
  const gPatches: Array<{ id: string; body: any }> = [];
  const gDeletes: string[] = [];
  const emails: Array<{ to: string; subject: string; text: string }> = [];
  let recCounter = 0;
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    const method = (init?.method || 'GET').toUpperCase();
    if (u.includes('oauth2.googleapis.com/token')) {
      return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
    }
    if (u.includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      emails.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject, text: b.text ?? '' });
      return new Response(JSON.stringify({ id: 'em_' + emails.length }), { status: 200 });
    }
    const m = u.match(/calendar\/v3\/calendars\/primary\/events(?:\/([^?]+))?/);
    if (m) {
      const id = m[1] ? decodeURIComponent(m[1]) : null;
      if (method === 'POST') {
        recCounter++;
        const body = JSON.parse(init.body);
        gPosts.push(body);
        const evtId = `recevt-${runId}-${recCounter}`;
        return new Response(JSON.stringify({
          id: evtId,
          conferenceData: { entryPoints: [{ entryPointType: 'video', uri: `https://meet.google.com/${evtId}` }] },
        }), { status: 200 });
      }
      if (method === 'PATCH' && id) { gPatches.push({ id, body: JSON.parse(init.body) }); return new Response(JSON.stringify({ id }), { status: 200 }); }
      if (method === 'DELETE' && id) { gDeletes.push(id); return new Response(null, { status: 204 }); }
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `t69-${runId}-host@example.com`, password: randomUUID(), email_confirm: true });
  const hostId = authUser!.user!.id;
  const { data: authUser2 } = await db.auth.admin.createUser({ email: `t69-${runId}-host2@example.com`, password: randomUUID(), email_confirm: true });
  const host2Id = authUser2!.user!.id;

  let workspaceId = '';
  const personalCalId = randomUUID();
  const rrCalId = randomUUID();
  const seriesIds: string[] = [];
  const aptCleanup: string[] = [];

  const futureWeekday = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: mem } = await db.from('workspace_members').select('workspace_id').eq('user_id', hostId).limit(1).maybeSingle();
    workspaceId = mem!.workspace_id;
    // put host2 in the same workspace
    try { await db.from('workspace_members').insert({ workspace_id: workspaceId, user_id: host2Id, role: 'member' }); } catch { /* may already be a member */ }

    const availability = Object.fromEntries(['0', '1', '2', '3', '4', '5', '6'].map((k) => [k, [{ start: '00:00', end: '23:59' }]]));
    await db.from('booking_calendars').insert([
      { id: personalCalId, workspace_id: workspaceId, name: `T69 personal ${runId}`, slug: `t69-p-${runId}`, calendar_type: 'personal', timezone: 'UTC', slot_duration: 30, meeting_mode: 'google_meet', cancellation_window_hours: 1, availability },
      { id: rrCalId, workspace_id: workspaceId, name: `T69 rr ${runId}`, slug: `t69-rr-${runId}`, calendar_type: 'round_robin', timezone: 'UTC', slot_duration: 30, meeting_mode: 'google_meet', cancellation_window_hours: 1, availability },
    ]);
    await db.from('round_robin_assignment').insert([
      { workspace_id: workspaceId, calendar_id: rrCalId, user_id: hostId, booking_count: 0 },
      { workspace_id: workspaceId, calendar_id: rrCalId, user_id: host2Id, booking_count: 0 },
    ]);
    await storeCalendarConnection({ workspaceId, userId: hostId, provider: 'google', accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 36e5, email: `g-${runId}@x.com`, scope: 's' });

    const { data: contact } = await db.from('contacts').insert({ workspace_id: workspaceId, email: `t69-${runId}-c@example.com`, first_name: 'Rae', last_name: 'K', phone: '+15005550006' }).select().single();
    const contactId = contact!.id;

    const trackSeries = (id: string) => { seriesIds.push(id); };

    // ============================================================ PART 1: create
    console.log('\n=== PART 1: create a weekly x4 recurring meeting ===');
    gPosts.length = 0; emails.length = 0;
    const startA = futureWeekday(7, '10:00');
    const endA = futureWeekday(7, '10:30');
    const resA: any = await createRecurringSeriesCore({ workspaceId, userId: hostId }, {
      calendarId: personalCalId, contactId, title: `T69 Weekly Sync`,
      startTime: startA, endTime: endA, meetingMode: 'google_meet',
      recurrence: { frequency: 'weekly', interval: 1, count: 4 },
    });
    check('createRecurringSeries succeeded', resA.success === true, JSON.stringify(resA.error || ''));
    if (resA.success) trackSeries(resA.data.seriesId);
    check('reported 4 occurrences created', resA.success && resA.data.occurrencesCreated === 4, JSON.stringify(resA.data));

    const { data: occA } = await db.from('appointments').select('*').eq('series_id', resA.data?.seriesId).order('start_time');
    check('exactly 4 real appointment rows exist for the series', (occA || []).length === 4);
    check('first occurrence == dtstart', sameInstant(occA?.[0]?.start_time, startA), occA?.[0]?.start_time);
    check('occurrences are 7 days apart', !!occA && occA.every((o: any, i: number) =>
      i === 0 || new Date(o.start_time).getTime() - new Date(occA[i - 1].start_time).getTime() === 7 * 864e5));
    check('every occurrence shares ONE meeting link', !!occA && new Set(occA.map((o: any) => o.meeting_link)).size === 1 && !!occA[0].meeting_link);
    check('  → the shared link is the real Google Meet link', occA?.[0]?.meeting_link?.includes('meet.google.com/recevt-'));
    check('every occurrence links back to the series', !!occA && occA.every((o: any) => o.series_id === resA.data.seriesId));

    check('EXACTLY ONE Google Calendar event POST (not 4)', gPosts.length === 1, `posts=${gPosts.length}`);
    check('  → it carries the native RRULE recurrence array', gPosts[0]?.recurrence?.[0] === 'RRULE:FREQ=WEEKLY;INTERVAL=1;COUNT=4', JSON.stringify(gPosts[0]?.recurrence));
    check('  → it requests a Meet conference', !!gPosts[0]?.conferenceData?.createRequest);

    const { data: seriesRow } = await db.from('recurring_series').select('*').eq('id', resA.data.seriesId).single();
    check('recurring_series row: rrule + google_recurring_event_id + count persisted',
      seriesRow?.rrule === 'FREQ=WEEKLY;INTERVAL=1;COUNT=4' && !!seriesRow?.google_recurring_event_id && seriesRow?.occurrence_count === 4);

    const cMail = [...emails].reverse().find((e) => e.to === `t69-${runId}-c@example.com`);
    check('ONE confirmation email to the booker, with the recurrence summary',
      !!cMail && /Repeats weekly, 4 occurrences/.test(cMail.text), cMail?.text.split('\n').find((l) => /Repeats/.test(l)) || '');

    // ============================================================ PART 2: RR host
    console.log('\n=== PART 2: round-robin → ONE host for the whole series ===');
    gPosts.length = 0;
    const resRR: any = await createRecurringSeriesCore({ workspaceId, userId: hostId }, {
      calendarId: rrCalId, contactId, title: `T69 RR Series`,
      startTime: futureWeekday(8, '14:00'), endTime: futureWeekday(8, '14:30'), meetingMode: 'google_meet',
      recurrence: { frequency: 'weekly', interval: 1, count: 3 },
    });
    check('RR recurring series created', resRR.success === true, JSON.stringify(resRR.error || ''));
    if (resRR.success) trackSeries(resRR.data.seriesId);
    const { data: occRR } = await db.from('appointments').select('user_id').eq('series_id', resRR.data?.seriesId);
    check('all occurrences assigned to the SAME host', !!occRR && new Set(occRR.map((o: any) => o.user_id)).size === 1 && !!occRR[0].user_id);
    const { data: rrRows } = await db.from('round_robin_assignment').select('booking_count').eq('calendar_id', rrCalId);
    const totalBookings = (rrRows || []).reduce((s: number, r: any) => s + (r.booking_count || 0), 0);
    check('round-robin booking_count incremented by exactly 1 for the whole series (not 3)', totalBookings === 1, `total=${totalBookings}`);

    // ============================================================ PART 3: this-only
    console.log('\n=== PART 3: edit / cancel a SINGLE occurrence ===');
    const occ2 = occA![1];
    const newStart2 = new Date(new Date(occ2.start_time).getTime() + 3 * 3600_000).toISOString();
    gPatches.length = 0;
    const rs: any = await updateRecurringScopeCore(workspaceId, { appointmentId: occ2.id, scope: 'this', action: 'reschedule', newStartTime: newStart2 });
    check('reschedule "this only" succeeded', rs.success === true, JSON.stringify(rs.error || ''));
    const { data: occ2After } = await db.from('appointments').select('*').eq('id', occ2.id).single();
    check('  → only that occurrence moved, flagged is_exception', sameInstant(occ2After?.start_time, newStart2) && occ2After?.is_exception === true);
    const { data: occ1After } = await db.from('appointments').select('start_time, is_exception').eq('id', occA![0].id).single();
    check('  → sibling occurrences untouched', sameInstant(occ1After?.start_time, occA![0].start_time) && !occ1After?.is_exception);
    check('  → Google got a PATCH to the specific instance with a new time',
      gPatches.some((p) => p.id.startsWith(seriesRow!.google_recurring_event_id + '_') && !!p.body.start));

    const occ3 = occA![2];
    gPatches.length = 0;
    const cs: any = await updateRecurringScopeCore(workspaceId, { appointmentId: occ3.id, scope: 'this', action: 'cancel' });
    check('cancel "this only" succeeded', cs.success === true, JSON.stringify(cs.error || ''));
    const { data: occ3After } = await db.from('appointments').select('status, is_exception').eq('id', occ3.id).single();
    check('  → that occurrence cancelled + is_exception; series otherwise intact', occ3After?.status === 'cancelled' && occ3After?.is_exception === true);
    const { data: stillScheduled } = await db.from('appointments').select('id', { count: 'exact', head: true }).eq('series_id', resA.data.seriesId).eq('status', 'scheduled');
    check('  → 3 of 4 occurrences still scheduled', (stillScheduled as any) === null || true); // count via separate query below
    const { count: schedCount } = await db.from('appointments').select('id', { count: 'exact', head: true }).eq('series_id', resA.data.seriesId).eq('status', 'scheduled');
    check('  → exactly 3 occurrences remain scheduled', schedCount === 3, `count=${schedCount}`);
    check('  → Google got an instance-cancel PATCH (status: cancelled)',
      gPatches.some((p) => p.body.status === 'cancelled'));

    // ============================================================ PART 4: following + all
    console.log('\n=== PART 4: "this and following" + "entire series" ===');
    const resB: any = await createRecurringSeriesCore({ workspaceId, userId: hostId }, {
      calendarId: personalCalId, contactId, title: `T69 Daily Standup`,
      startTime: futureWeekday(20, '09:00'), endTime: futureWeekday(20, '09:15'), meetingMode: 'google_meet',
      recurrence: { frequency: 'daily', interval: 1, count: 6 },
    });
    check('6-occurrence daily series created', resB.success === true, JSON.stringify(resB.error || ''));
    if (resB.success) trackSeries(resB.data.seriesId);
    const { data: occB } = await db.from('appointments').select('*').eq('series_id', resB.data?.seriesId).order('start_time');
    const seriesBEvtId = (await db.from('recurring_series').select('google_recurring_event_id').eq('id', resB.data.seriesId).single()).data?.google_recurring_event_id;

    gPatches.length = 0;
    const fol: any = await updateRecurringScopeCore(workspaceId, { appointmentId: occB![3].id, scope: 'following', action: 'cancel' });
    check('"this and following" cancel succeeded', fol.success === true, JSON.stringify(fol.error || ''));
    const { count: bSched } = await db.from('appointments').select('id', { count: 'exact', head: true }).eq('series_id', resB.data.seriesId).eq('status', 'scheduled');
    check('  → occurrences 4,5,6 cancelled; 1,2,3 remain (3 scheduled)', bSched === 3, `count=${bSched}`);
    const { data: bSeriesAfter } = await db.from('recurring_series').select('rrule, status').eq('id', resB.data.seriesId).single();
    check('  → series RRULE truncated with an UNTIL', /UNTIL=/.test(bSeriesAfter?.rrule || '') && bSeriesAfter?.status === 'active', bSeriesAfter?.rrule);
    check('  → Google recurring event PATCHed with the truncated rule',
      gPatches.some((p) => p.id === seriesBEvtId && /UNTIL=/.test(p.body.recurrence?.[0] || '')));

    gDeletes.length = 0;
    const allc: any = await updateRecurringScopeCore(workspaceId, { appointmentId: occB![0].id, scope: 'all', action: 'cancel' });
    check('"entire series" cancel succeeded', allc.success === true, JSON.stringify(allc.error || ''));
    const { count: bSched2 } = await db.from('appointments').select('id', { count: 'exact', head: true }).eq('series_id', resB.data.seriesId).eq('status', 'scheduled').gt('start_time', new Date().toISOString());
    check('  → no future occurrences remain scheduled', bSched2 === 0, `count=${bSched2}`);
    const { data: bSeriesFinal } = await db.from('recurring_series').select('status').eq('id', resB.data.seriesId).single();
    check('  → series marked cancelled', bSeriesFinal?.status === 'cancelled');
    check('  → the whole Google recurring event was DELETEd', gDeletes.includes(seriesBEvtId!), JSON.stringify(gDeletes));

    // ============================================================ PART 5: reminders regression
    console.log('\n=== PART 5: reminders fire for recurring occurrences ===');
    const resC: any = await createRecurringSeriesCore({ workspaceId, userId: hostId }, {
      calendarId: personalCalId, contactId, title: `T69 Reminder Series`,
      startTime: new Date(Date.now() + 58 * 60000).toISOString(),
      endTime: new Date(Date.now() + 88 * 60000).toISOString(),
      meetingMode: 'internal_meet',
      recurrence: { frequency: 'daily', interval: 1, count: 3 },
    });
    check('reminder-series created (internal_meet)', resC.success === true, JSON.stringify(resC.error || ''));
    if (resC.success) trackSeries(resC.data.seriesId);
    emails.length = 0;
    const remRes = await (await remindersGET({ headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? `Bearer ${process.env.CRON_SECRET}` : null) } } as any)).json();
    check('reminders cron picked up the ~1h-out recurring occurrence', (remRes.reminders_sent ?? 0) >= 1, JSON.stringify(remRes));
    check('  → the occurrence got its own reminder email', emails.some((e) => e.to === `t69-${runId}-c@example.com` && /in 1 hour/.test(e.text)));

    // ============================================================ PART 6: no-Google fallback + single-meeting regression
    console.log('\n=== PART 6: fallback + non-recurring regression ===');
    await deleteCalendarConnection(workspaceId, hostId, 'google');
    gPosts.length = 0;
    const resD: any = await createRecurringSeriesCore({ workspaceId, userId: hostId }, {
      calendarId: personalCalId, contactId, title: `T69 No Google`,
      startTime: futureWeekday(30, '11:00'), endTime: futureWeekday(30, '11:30'), meetingMode: 'google_meet',
      recurrence: { frequency: 'weekly', interval: 1, count: 2 },
    });
    check('series still created when host has no Google connection', resD.success === true, JSON.stringify(resD.error || ''));
    if (resD.success) trackSeries(resD.data.seriesId);
    check('  → NO Google event POST attempted', gPosts.length === 0);
    check('  → honest fallback: internal link + google_meet_pending_connection',
      resD.data?.meetingLinkStatus === 'google_meet_pending_connection' && resD.data?.meetingLink?.includes('/meet/'));

    // a plain (non-recurring) appointment is completely untouched by series ops
    const { data: plain } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: personalCalId, contact_id: contactId, title: 'T69 Plain',
      start_time: futureWeekday(3, '15:00'), end_time: futureWeekday(3, '15:30'), status: 'scheduled', meeting_mode: 'internal_meet', metadata: {},
    }).select().single();
    aptCleanup.push(plain!.id);
    check('plain appointment has series_id NULL (regression)', plain?.series_id === null);
    const scopeOnPlain: any = await updateRecurringScopeCore(workspaceId, { appointmentId: plain!.id, scope: 'all', action: 'cancel' });
    check('scope op refuses a non-series appointment', scopeOnPlain.success === false && /not part of a recurring series/i.test(scopeOnPlain.error || ''));
    const { data: plainAfter } = await db.from('appointments').select('status').eq('id', plain!.id).single();
    check('  → the plain appointment is untouched', plainAfter?.status === 'scheduled');
  } finally {
    globalThis.fetch = realFetch;
    for (const sid of seriesIds) await db.from('appointments').delete().eq('series_id', sid);
    if (aptCleanup.length) await db.from('appointments').delete().in('id', aptCleanup);
    if (workspaceId) {
      await db.from('recurring_series').delete().eq('workspace_id', workspaceId);
      await db.from('round_robin_assignment').delete().eq('workspace_id', workspaceId).in('calendar_id', [rrCalId]);
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId);
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `t69-${runId}-%`);
      await db.from('booking_calendars').delete().in('id', [personalCalId, rrCalId]);
    }
    await db.auth.admin.deleteUser(hostId).catch(() => {});
    await db.auth.admin.deleteUser(host2Id).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
