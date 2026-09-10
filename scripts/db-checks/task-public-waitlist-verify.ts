/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
process.env.RESEND_API_KEY = 're_publicwaitlist00000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

// The complete loop with a real front door:
//   class session created with capacity/waitlist  ->  2 public bookings fill it
//   ->  a 3rd public visitor sees "Full" + JOINS THE WAITLIST (zero admin)
//   ->  a spot frees (portal-cancel-equivalent decrement)  ->  real offer email
//   ->  the publicly-joined person accepts  ->  spot claimed, off the waitlist.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { bookClassSession, fetchPublicSlots } = await import('../../src/app/actions/calendar/public');
  const { notifyNewlyOfferedWaitlist } = await import('../../src/lib/calendar/waitlist');
  const { generateWaitlistToken } = await import('../../src/lib/calendar/waitlistToken');
  const { acceptWaitlistOffer } = await import('../../src/app/actions/calendar/waitlistAccept');
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

  const { data: authUser } = await db.auth.admin.createUser({ email: `pwl-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const calId = randomUUID();
  const aptIds: string[] = [];

  const futureWeekday = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };
  const lead = (n: string) => ({ firstName: n, lastName: 'T', email: `pwl-${runId}-${n.toLowerCase()}@example.com`, phone: '', notes: '', popiaConsent: true, answers: {} });

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    // ---- 1. a class_booking calendar with capacity 2 + waitlist (what the new CalendarSettingsModal fields produce) ----
    await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `T-PWL Yoga ${runId}`, slug: `t-pwl-${runId}`,
      calendar_type: 'class_booking', timezone: 'UTC', slot_duration: 60, meeting_mode: 'internal_meet',
      capacity: 2, waitlist_enabled: true, cancellation_window_hours: 1,
      availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
    });

    const sessionSlot = futureWeekday(8, '10:00');

    // slot shows as open, 2 spots
    const slots0 = await fetchPublicSlots(calId, sessionSlot.split('T')[0]);
    const s0 = (slots0 as any[]).find((s) => s.start === sessionSlot);
    check('public slot for the class session shows as open with real capacity', !!s0 && s0.full === false && s0.spotsLeft === 2, s0 ? `${s0.spotsLeft} left` : 'not found');

    // ---- 2. two public bookings fill it ----
    const b1 = await bookClassSession(calId, sessionSlot, lead('Ann'));
    check('public booking #1 → booked', b1.success && (b1 as any).mode === 'booked', JSON.stringify(b1));
    aptIds.push((b1 as any).appointmentId);
    const b2 = await bookClassSession(calId, sessionSlot, lead('Bea'));
    check('public booking #2 → booked (session now 2/2)', b2.success && (b2 as any).mode === 'booked');

    const { data: sess } = await db.from('appointments').select('id, current_attendee_count, max_attendees').eq('calendar_id', calId).single();
    check('session current_attendee_count == 2 (at capacity)', sess!.current_attendee_count === 2);

    // slot now shows Full · Waitlist
    const slots1 = await fetchPublicSlots(calId, sessionSlot.split('T')[0]);
    const s1 = (slots1 as any[]).find((s) => s.start === sessionSlot);
    check('★ public slot now shows FULL + waitlist-enabled (the "Join waitlist" state)', !!s1 && s1.full === true && s1.waitlistEnabled === true);

    // ---- 3. a 3rd public visitor joins the waitlist — ZERO admin involvement ----
    emails.length = 0;
    const b3 = await bookClassSession(calId, sessionSlot, lead('Cid'));
    check('★ public visitor #3 joins the waitlist (mode=waitlist)', b3.success && (b3 as any).mode === 'waitlist', JSON.stringify(b3));
    check('  → position #1 on the waitlist', (b3 as any).position === 1);
    const { data: wlRows } = await db.from('booking_waitlists').select('id, position, confirmed, contact:contacts(email)').eq('appointment_id', sess!.id).eq('confirmed', false).order('position');
    check('  → a real booking_waitlists row was created for the public joiner', (wlRows || []).length === 1 && (wlRows as any)[0].contact.email === `pwl-${runId}-cid@example.com`);
    check('  → they got a "you\'re #1 on the waitlist" email', !!lastTo(`pwl-${runId}-cid@example.com`) && /waitlist/i.test(lastTo(`pwl-${runId}-cid@example.com`)!.subject));

    // ---- 4. a spot frees via a portal cancel — EXACTLY the decrement + notify the portal fix now does ----
    emails.length = 0;
    await db.from('appointments').update({ current_attendee_count: 1 }).eq('id', sess!.id); // portalBookings.ts cancelPayload for a group session
    await notifyNewlyOfferedWaitlist(sess!.id); // portalBookings.ts now calls this
    const { data: wlAfter } = await db.from('booking_waitlists').select('id, offered_at, offer_expires_at').eq('appointment_id', sess!.id).eq('confirmed', false).single();
    check('★ freed spot → the publicly-joined person is offered it (offered_at set), same as an admin-added entry', !!wlAfter!.offered_at && !!wlAfter!.offer_expires_at);
    check('  → they received a real OFFER email with an accept link', !!lastTo(`pwl-${runId}-cid@example.com`) && lastTo(`pwl-${runId}-cid@example.com`)!.text.includes(`/book/waitlist/${wlAfter!.id}.`));

    // ---- 5. accept — full loop completes ----
    emails.length = 0;
    const acc = await acceptWaitlistOffer(generateWaitlistToken(wlAfter!.id));
    check('★ the publicly-joined person accepts → real spot claimed', acc.success === true, JSON.stringify(acc));
    const { data: sessFinal } = await db.from('appointments').select('current_attendee_count').eq('id', sess!.id).single();
    check('  → session back to 2/2', sessFinal!.current_attendee_count === 2);
    const { data: wlFinal } = await db.from('booking_waitlists').select('confirmed').eq('id', wlAfter!.id).single();
    check('  → removed from the waitlist (confirmed = true)', wlFinal!.confirmed === true);
    check('  → confirmation email to the (formerly public-waitlisted) person', !!lastTo(`pwl-${runId}-cid@example.com`) && /off the waitlist/i.test(lastTo(`pwl-${runId}-cid@example.com`)!.subject));
  } finally {
    globalThis.fetch = realFetch;
    const { data: allApts } = await db.from('appointments').select('id').eq('calendar_id', calId);
    const ids = (allApts || []).map((a: any) => a.id);
    if (ids.length) {
      await db.from('booking_waitlists').delete().in('appointment_id', ids);
      await db.from('appointments').delete().in('id', ids);
    }
    if (workspaceId) {
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `pwl-${runId}-%`);
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
