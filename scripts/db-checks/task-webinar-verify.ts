/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.RESEND_API_KEY = 're_webinarverify00000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

// Webinar feature — real proof that 'webinar' is a genuine first-class
// calendar_type sharing the EXACT SAME group-session infrastructure as
// 'class_booking' (capacity cap, fn_secure_booking_or_waitlist, per-attendee
// booking_waitlists records, waitlist offer/accept), with real distinct
// behavior (default capacity, "Webinar" copy) — and that Class keeps working
// unaffected, coexisting as a separate type. See docs/calendar-webinar-feature.md.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { bookGroupSession, fetchPublicSlots } = await import('../../src/app/actions/calendar/public');
  const { isGroupSessionType, getGroupSessionNoun, getCapacityCeilingWarning, DEFAULT_GROUP_CAPACITY } = await import(
    '../../src/lib/calendar/calendarTypes'
  );
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };

  const realFetch = globalThis.fetch;
  const emails: Array<{ to: string; subject: string; text: string }> = [];
  const lastTo = (to: string) => [...emails].reverse().find((e) => e.to === to);
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    if (u.includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      emails.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject, text: b.text ?? '' });
      return new Response(JSON.stringify({ id: 'em' }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `web-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const webinarCalId = randomUUID();
  const classCalId = randomUUID();
  const aptIds: string[] = [];

  const futureWeekday = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };
  const lead = (n: string, tag: string) => ({ firstName: n, lastName: 'T', email: `web-${runId}-${tag}@example.com`, phone: '', notes: '', popiaConsent: true, answers: {} });

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    // ---- 0. pure logic: type metadata is real and distinct ----
    check('★ webinar is recognized as a group-session type', isGroupSessionType('webinar'));
    check('  → class_booking still recognized as a group-session type (coexistence)', isGroupSessionType('class_booking'));
    check('  → an unrelated type is NOT a group-session type', !isGroupSessionType('personal'));
    check('  → webinar noun is "Webinar", class noun is "Group session" (distinct copy)', getGroupSessionNoun('webinar') === 'Webinar' && getGroupSessionNoun('class_booking') === 'Group session');
    check('  → webinar default capacity (100) is real and different from class default (12)', DEFAULT_GROUP_CAPACITY.webinar === 100 && DEFAULT_GROUP_CAPACITY.class_booking === 12);

    // ---- 0b. capacity-ceiling honesty check (Step 1.3) ----
    const warnHigh = getCapacityCeilingWarning('webinar', 'zoom', 500);
    const warnLow = getCapacityCeilingWarning('webinar', 'zoom', 50);
    const warnInternal = getCapacityCeilingWarning('webinar', 'internal_meet', 500);
    const warnClass = getCapacityCeilingWarning('class_booking', 'zoom', 500);
    check('★ a webinar with 500 capacity on Zoom gets a real capacity-ceiling warning (not a silent false promise)', !!warnHigh && /Zoom/.test(warnHigh) && /webinar/i.test(warnHigh));
    check('  → the warning names it a REGULAR meeting, distinct from Zoom\'s separate large-scale webinar product', /regular Zoom meeting/i.test(warnHigh!) && /separate large-scale webinar/i.test(warnHigh!));
    check('  → a webinar at 50 capacity on Zoom gets NO warning (below the honest ceiling)', warnLow === null);
    check('  → a webinar at 500 capacity on LeadsMind\'s own internal room gets NO warning (no vendor ceiling)', warnInternal === null);
    check('  → the SAME warning logic also protects a Class set to an unrealistic capacity', !!warnClass);

    // ---- 1. a real Webinar calendar, created via the same admin path as Class ----
    await db.from('booking_calendars').insert({
      id: webinarCalId, workspace_id: workspaceId, name: `T-WEB Product Launch ${runId}`, slug: `t-web-${runId}`,
      calendar_type: 'webinar', timezone: 'UTC', slot_duration: 60, meeting_mode: 'internal_meet',
      capacity: 3, waitlist_enabled: true, cancellation_window_hours: 1,
      availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
    });

    const webinarSlot = futureWeekday(8, '11:00');

    const slots0 = await fetchPublicSlots(webinarCalId, webinarSlot.split('T')[0]);
    const s0 = (slots0 as any[]).find((s) => s.start === webinarSlot);
    check('★ the public slot for a WEBINAR calendar shows real capacity (getAvailableSlots treats it as a group session)', !!s0 && s0.full === false && s0.spotsLeft === 3, s0 ? `${s0.spotsLeft} left` : 'not found');

    // ---- 2. real bookings via the SAME bookGroupSession() + fn_secure_booking_or_waitlist RPC as Class ----
    const b1 = await bookGroupSession(webinarCalId, webinarSlot, lead('Reg1', 'reg1'));
    const b2 = await bookGroupSession(webinarCalId, webinarSlot, lead('Reg2', 'reg2'));
    const b3 = await bookGroupSession(webinarCalId, webinarSlot, lead('Reg3', 'reg3'));
    check('★ 3 real registrations booked via the shared group-session booking function', [b1, b2, b3].every((b: any) => b.success && b.mode === 'booked'), JSON.stringify([b1, b2, b3]));
    aptIds.push((b1 as any).appointmentId);

    const { data: sess } = await db.from('appointments').select('id, current_attendee_count, max_attendees').eq('calendar_id', webinarCalId).single();
    check('  → session at capacity (3/3) via the real max_attendees/current_attendee_count columns — no separate webinar schema', sess!.current_attendee_count === 3 && sess!.max_attendees === 3);

    const { data: recs } = await db.from('booking_waitlists').select('id, contact:contacts(email)').eq('appointment_id', sess!.id).eq('confirmed', true);
    check('★ real per-attendee records exist for each registrant (the SAME booking_waitlists table Class uses)', (recs || []).length === 3);

    check('★ each attendee got their own real confirmation email', ['reg1', 'reg2', 'reg3'].every((tag) => !!lastTo(`web-${runId}-${tag}@example.com`)));

    // ---- 3. full: a 4th registrant joins the waitlist (real, shared logic) ----
    emails.length = 0;
    const b4 = await bookGroupSession(webinarCalId, webinarSlot, lead('Reg4', 'reg4'));
    check('★ a 4th registrant joins the real waitlist when the webinar is full', b4.success && (b4 as any).mode === 'waitlist' && (b4 as any).position === 1, JSON.stringify(b4));
    check('  → they got a real "on the waitlist" email', !!lastTo(`web-${runId}-reg4@example.com`) && /waitlist/i.test(lastTo(`web-${runId}-reg4@example.com`)!.subject));

    // ---- 4. one attendee cancels their own spot — only theirs, session unaffected (shared cancel semantics) ----
    const { cancelAttendeeSpot } = await import('../../src/lib/calendar/waitlist');
    emails.length = 0;
    const firstRec = (recs as any[])[0];
    const cancelRes = await cancelAttendeeSpot(firstRec.id);
    check('★ one attendee cancels their own spot via the SAME cancelAttendeeSpot Class uses', cancelRes.success === true, JSON.stringify(cancelRes));
    const { data: sessAfterCancel } = await db.from('appointments').select('current_attendee_count, status').eq('id', sess!.id).single();
    check('  → exactly one seat freed (3 → 2), webinar itself NOT cancelled', sessAfterCancel!.current_attendee_count === 2 && sessAfterCancel!.status === 'scheduled');
    const { data: waitlistRow } = await db.from('booking_waitlists').select('offered_at').eq('appointment_id', sess!.id).eq('confirmed', false).single();
    check('  → the freed seat was offered to the waitlisted registrant (real waitlist promotion, shared with Class)', !!waitlistRow!.offered_at);

    // ---- 5. host cancels the whole webinar — every remaining registrant notified (shared cancelGroupSession) ----
    const { cancelGroupSession } = await import('../../src/lib/calendar/waitlist');
    emails.length = 0;
    await cancelGroupSession(sess!.id);
    const { data: allRows } = await db.from('booking_waitlists').select('cancelled_at').eq('appointment_id', sess!.id);
    check('★ host cancel → every remaining registration record cancelled (same cancelGroupSession Class uses)', (allRows || []).every((r: any) => !!r.cancelled_at));
    check('  → remaining registrants notified of the cancellation', emails.some((e) => /cancelled/i.test(e.subject)));

    // ---- 6. COEXISTENCE: Class still works unaffected by the Webinar type existing ----
    await db.from('booking_calendars').insert({
      id: classCalId, workspace_id: workspaceId, name: `T-WEB Yoga Class ${runId}`, slug: `t-web-class-${runId}`,
      calendar_type: 'class_booking', timezone: 'UTC', slot_duration: 60, meeting_mode: 'internal_meet',
      capacity: 2, waitlist_enabled: true, cancellation_window_hours: 1,
      availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
    });
    const classSlot = futureWeekday(9, '10:00');
    const cb1 = await bookGroupSession(classCalId, classSlot, lead('ClassAtt', 'classatt'));
    check('★ COEXISTENCE: a Class calendar still books correctly alongside the new Webinar type', cb1.success && (cb1 as any).mode === 'booked', JSON.stringify(cb1));
    const { data: classApt } = await db.from('appointments').select('id').eq('calendar_id', classCalId).single();
    aptIds.push(classApt!.id);
  } finally {
    globalThis.fetch = realFetch;
    const { data: allApts } = await db.from('appointments').select('id').in('calendar_id', [webinarCalId, classCalId]);
    const ids = (allApts || []).map((a: any) => a.id);
    if (ids.length) {
      await db.from('booking_waitlists').delete().in('appointment_id', ids);
      await db.from('appointments').delete().in('id', ids);
    }
    if (workspaceId) {
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `web-${runId}-%`);
    }
    await db.from('booking_calendars').delete().in('id', [webinarCalId, classCalId]);
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
