/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.RESEND_API_KEY = 're_attendeerecords0000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

// Per-attendee records for booked class-session attendees:
//   2 different people book the SAME 2-spot session
//     -> each gets their OWN confirmation email with their OWN manage link
//     -> each manage link resolves ONLY that person's booking
//   A cancels her spot via her link
//     -> only A's record is cancelled; B is untouched; the session is NOT cancelled
//     -> one seat frees; the waitlisted person is offered it (not the whole session)
//   the waitlisted person accepts -> back to 2/2
//   the host cancels the whole session -> every remaining attendee notified.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { bookGroupSession } = await import('../../src/app/actions/calendar/public');
  const { generateWaitlistToken } = await import('../../src/lib/calendar/waitlistToken');
  const {
    getAttendeeBooking,
    cancelAttendeeByToken,
    acceptWaitlistOffer,
    getWaitlistOffer,
  } = await import('../../src/app/actions/calendar/waitlistAccept');
  const { cancelGroupSession } = await import('../../src/lib/calendar/waitlist');
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

  const { data: authUser } = await db.auth.admin.createUser({ email: `ar-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const calId = randomUUID();

  const futureWeekday = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };
  const em = (n: string) => `ar-${runId}-${n.toLowerCase()}@example.com`;
  const lead = (n: string) => ({ firstName: n, lastName: 'T', email: em(n), phone: '', notes: '', popiaConsent: true, answers: {} });

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `T-AR Class ${runId}`, slug: `t-ar-${runId}`,
      calendar_type: 'class_booking', timezone: 'UTC', slot_duration: 60, meeting_mode: 'internal_meet',
      capacity: 2, waitlist_enabled: true, cancellation_window_hours: 1,
      availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
    });

    const slot = futureWeekday(9, '10:00');

    // ---- 1. two different people book the same 2-spot session ----
    emails.length = 0;
    const bA = await bookGroupSession(calId, slot, lead('Anna'));
    const bB = await bookGroupSession(calId, slot, lead('Bella'));
    check('two people book the same session → both booked', bA.success && bB.success && (bA as any).mode === 'booked' && (bB as any).mode === 'booked', JSON.stringify([bA, bB]));

    const { data: sess } = await db.from('appointments').select('id, status, current_attendee_count, contact_id').eq('calendar_id', calId).single();
    check('session is 2/2 and status scheduled', sess!.current_attendee_count === 2 && sess!.status === 'scheduled');

    const { data: recs } = await db
      .from('booking_waitlists')
      .select('id, confirmed, cancelled_at, booked_at, position, contact:contacts(email)')
      .eq('appointment_id', sess!.id)
      .eq('confirmed', true);
    check('★ a per-attendee record exists for EACH booked person (2 rows)', (recs || []).length === 2);
    const recA = (recs as any[]).find((r) => r.contact.email === em('Anna'));
    const recB = (recs as any[]).find((r) => r.contact.email === em('Bella'));
    check('  → both records: confirmed, not cancelled, position NULL, booked_at set', !!recA && !!recB && [recA, recB].every((r) => r.confirmed && !r.cancelled_at && r.position === null && !!r.booked_at));

    // ---- 2. each got their OWN confirmation email with their OWN manage link ----
    const mailA = lastTo(em('Anna'));
    const mailB = lastTo(em('Bella'));
    check('★ each attendee received their own booking-confirmed email', !!mailA && !!mailB && /confirmed/i.test(mailA!.subject) && /confirmed/i.test(mailB!.subject));
    check('  → Anna\'s email links to Anna\'s OWN attendee record', !!mailA && mailA!.text.includes(`/book/waitlist/${recA.id}.`));
    check('  → Bella\'s email links to Bella\'s OWN attendee record', !!mailB && mailB!.text.includes(`/book/waitlist/${recB.id}.`));
    check('  → the two manage links are different', !!mailA && !!mailB && recA.id !== recB.id && !mailA!.text.includes(recB.id) && !mailB!.text.includes(recA.id));

    // ---- 3. a 3rd person joins the waitlist ----
    const bC = await bookGroupSession(calId, slot, lead('Cara'));
    check('3rd person joins the waitlist', bC.success && (bC as any).mode === 'waitlist' && (bC as any).position === 1);
    const { data: recC } = await db.from('booking_waitlists').select('id').eq('appointment_id', sess!.id).eq('confirmed', false).single();

    // ---- 4. each manage link resolves ONLY its own booking ----
    const tokA = generateWaitlistToken(recA.id);
    const tokB = generateWaitlistToken(recB.id);
    const viewA = await getAttendeeBooking(tokA);
    const viewB = await getAttendeeBooking(tokB);
    check('★ Anna\'s token shows Anna\'s confirmed booking (cancellable)', viewA.success === true && (viewA as any).data.cancellable === true);
    check('★ Bella\'s token shows Bella\'s confirmed booking', viewB.success === true);
    // The offer route must NOT treat a confirmed attendee as an open offer.
    const offerViaA = await getWaitlistOffer(tokA);
    check('  → the offer route rejects a confirmed attendee\'s token', offerViaA.success === false);

    // ---- 5. Anna cancels HER spot — only hers ----
    emails.length = 0;
    const cancelA = await cancelAttendeeByToken(tokA);
    check('★ Anna cancels her own spot', cancelA.success === true, JSON.stringify(cancelA));

    const { data: recAafter } = await db.from('booking_waitlists').select('cancelled_at').eq('id', recA.id).single();
    const { data: recBafter } = await db.from('booking_waitlists').select('cancelled_at, confirmed').eq('id', recB.id).single();
    const { data: sessAfter } = await db.from('appointments').select('status, current_attendee_count').eq('id', sess!.id).single();
    check('  → ONLY Anna\'s record is cancelled', !!recAafter!.cancelled_at);
    check('  → Bella\'s record is untouched (still confirmed, not cancelled)', !recBafter!.cancelled_at && recBafter!.confirmed === true);
    check('★ the SESSION itself is NOT cancelled (status still scheduled)', sessAfter!.status === 'scheduled');
    check('  → exactly one seat freed (count 2 → 1)', sessAfter!.current_attendee_count === 1);
    check('  → Anna got a "your spot is cancelled" email', !!lastTo(em('Anna')) && /spot is cancelled/i.test(lastTo(em('Anna'))!.subject));
    check('★ the freed seat is offered to the WAITLISTED person (not "session cancelled")', !!lastTo(em('Cara')) && /spot opened up/i.test(lastTo(em('Cara'))!.subject));

    const { data: recCoffered } = await db.from('booking_waitlists').select('offered_at').eq('id', recC!.id).single();
    check('  → Cara\'s waitlist row now has offered_at set', !!recCoffered!.offered_at);

    // Anna's now-cancelled token no longer manages a booking.
    const viewAgone = await getAttendeeBooking(tokA);
    check('  → Anna\'s token no longer resolves a live booking', viewAgone.success === false);

    // ---- 6. Cara accepts the freed seat ----
    emails.length = 0;
    const accC = await acceptWaitlistOffer(generateWaitlistToken(recC!.id));
    check('Cara accepts the offer → seat claimed', accC.success === true, JSON.stringify(accC));
    const { data: recCfinal } = await db.from('booking_waitlists').select('confirmed, booked_at').eq('id', recC!.id).single();
    check('  → Cara is now a confirmed attendee with booked_at set', recCfinal!.confirmed === true && !!recCfinal!.booked_at);
    const { data: sess2 } = await db.from('appointments').select('current_attendee_count').eq('id', sess!.id).single();
    check('  → session back to 2/2 (Bella + Cara)', sess2!.current_attendee_count === 2);

    // ---- 7. the HOST cancels the whole session ----
    emails.length = 0;
    await cancelGroupSession(sess!.id);
    await db.from('appointments').update({ status: 'cancelled' }).eq('id', sess!.id); // what the staff action does alongside
    const { data: allRows } = await db.from('booking_waitlists').select('cancelled_at').eq('appointment_id', sess!.id);
    check('★ host cancel → every remaining participation record is cancelled', (allRows || []).every((r: any) => !!r.cancelled_at));
    check('  → Bella notified of the session cancellation', !!lastTo(em('Bella')) && /session cancelled/i.test(lastTo(em('Bella'))!.subject));
    check('  → Cara notified of the session cancellation', !!lastTo(em('Cara')) && /session cancelled/i.test(lastTo(em('Cara'))!.subject));
    check('  → Anna (already cancelled) is NOT re-emailed', !lastTo(em('Anna')));
  } finally {
    globalThis.fetch = realFetch;
    const { data: allApts } = await db.from('appointments').select('id').eq('calendar_id', calId);
    const ids = (allApts || []).map((a: any) => a.id);
    if (ids.length) {
      await db.from('booking_waitlists').delete().in('appointment_id', ids);
      await db.from('appointments').delete().in('id', ids);
    }
    if (workspaceId) {
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `ar-${runId}-%`);
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
