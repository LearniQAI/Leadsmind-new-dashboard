/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';
// A plausible-looking key so lib/email.ts proceeds to the Resend SDK call
// (which we intercept via fetch) instead of throwing its "not configured" guard.
process.env.RESEND_API_KEY = 're_task65verify0000000000';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { resolveMeetingLink, applyResolvedMeetingLink } = await import('../../src/lib/calendar/meetingLink');
  const { storeCalendarConnection, deleteCalendarConnection } = await import('../../src/lib/calendar/connections');
  const { generateManageToken } = await import('../../src/lib/calendar/manageToken');
  const { generateWaitlistToken } = await import('../../src/lib/calendar/waitlistToken');
  const { sendBookingConfirmation } = await import('../../src/lib/calendar/notifications');
  const { rescheduleAppointmentByToken, cancelAppointmentByToken, getAppointmentByToken } = await import('../../src/app/actions/calendar/manage');
  const { notifyNewlyOfferedWaitlist, advanceExpiredWaitlistOffers } = await import('../../src/lib/calendar/waitlist');
  const { getWaitlistOffer, acceptWaitlistOffer } = await import('../../src/app/actions/calendar/waitlistAccept');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };

  // ---- intercept outbound HTTP: Google Calendar events + Resend emails ----
  const realFetch = globalThis.fetch;
  const gEvents = new Map<string, any>();
  const emails: Array<{ to: string; subject: string; text: string }> = [];
  const lastEmailTo = (to: string) => [...emails].reverse().find((e) => e.to === to);
  globalThis.fetch = (async (url: any, init?: any) => {
    const u = String(url);
    const method = (init?.method || 'GET').toUpperCase();
    if (u.includes('oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'x', expires_in: 3600 }), { status: 200 });
    if (u.includes('api.resend.com/emails')) {
      const body = JSON.parse(init.body);
      emails.push({ to: Array.isArray(body.to) ? body.to[0] : body.to, subject: body.subject, text: body.text ?? '' });
      return new Response(JSON.stringify({ id: 'em_' + emails.length }), { status: 200 });
    }
    const m = u.match(/calendar\/v3\/calendars\/primary\/events(?:\/([^?]+))?/);
    if (m) {
      const id = m[1] ? decodeURIComponent(m[1]) : null;
      if (method === 'POST') {
        const body = JSON.parse(init.body);
        const nid = `gevt-${runId}-${gEvents.size}`;
        gEvents.set(nid, { id: nid, start: body.start, end: body.end });
        return new Response(JSON.stringify({ id: nid, conferenceData: { entryPoints: [{ entryPointType: 'video', uri: `https://meet.google.com/${nid}` }] } }), { status: 200 });
      }
      if (method === 'PATCH' && id) { const e = gEvents.get(id); if (e) { const b = JSON.parse(init.body); e.start = b.start ?? e.start; } return new Response(JSON.stringify(e ?? {}), { status: e ? 200 : 404 }); }
      if (method === 'DELETE' && id) { gEvents.delete(id); return new Response(null, { status: 204 }); }
    }
    return realFetch(url, init);
  }) as typeof fetch;

  const { data: authUser } = await db.auth.admin.createUser({ email: `t65-${runId}-host@example.com`, password: randomUUID(), email_confirm: true });
  const hostId = authUser!.user!.id;
  let workspaceId = '';
  const gcalId = randomUUID();
  const zcalId = randomUUID();
  const aptIds: string[] = [];
  let contactAId = '', contactBId = '';

  const futureWeekday = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', hostId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    for (const [id, mode] of [[gcalId, 'google_meet'], [zcalId, 'zoom']] as const) {
      await db.from('booking_calendars').insert({
        id, workspace_id: workspaceId, name: `T65 ${mode} ${runId}`, slug: `t65-${mode}-${runId}`,
        calendar_type: 'personal', timezone: 'UTC', slot_duration: 30, meeting_mode: mode, cancellation_window_hours: 24,
        availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
      });
    }
    await storeCalendarConnection({ workspaceId, userId: hostId, provider: 'google', accessToken: 'a', refreshToken: 'r', expiresAt: Date.now() + 36e5, email: `c-${runId}@gmail.com`, scope: 's' });

    const { data: cA } = await db.from('contacts').insert({ workspace_id: workspaceId, email: `t65-${runId}-a@example.com`, first_name: 'Alice', last_name: 'A' }).select().single();
    const { data: cB } = await db.from('contacts').insert({ workspace_id: workspaceId, email: `t65-${runId}-b@example.com`, first_name: 'Bob', last_name: 'B' }).select().single();
    contactAId = cA!.id; contactBId = cB!.id;

    // helper: create an appointment the way public.ts does (insert + resolveMeetingLink)
    const book = async (calId: string, mode: string, contactId: string, startIso: string) => {
      const { data: apt } = await db.from('appointments').insert({
        workspace_id: workspaceId, calendar_id: calId, contact_id: contactId, user_id: hostId,
        title: `T65 ${mode} booking`, start_time: startIso, end_time: new Date(new Date(startIso).getTime() + 18e5).toISOString(),
        status: 'scheduled', meeting_mode: mode, metadata: {},
      }).select().single();
      aptIds.push(apt!.id);
      const resolved = await resolveMeetingLink({
        appointmentId: apt!.id, requestedMode: mode, hostUserId: hostId, workspaceId,
        calendarCustomLink: null, title: apt!.title, startTime: startIso, endTime: apt!.end_time,
      });
      await db.from('appointments').update({
        meeting_link: resolved.meetingLink, meeting_mode: resolved.meetingMode,
        metadata: applyResolvedMeetingLink(apt!.metadata, resolved),
      }).eq('id', apt!.id);
      return apt!.id;
    };

    console.log('\n=== PART 1: confirmations + self-service cancel/reschedule ===');

    // 1a. google_meet confirmation email
    const gAptId = await book(gcalId, 'google_meet', contactAId, futureWeekday(8, '10:00'));
    emails.length = 0;
    await sendBookingConfirmation(gAptId, { reason: 'booked' });
    const gMail = lastEmailTo(`t65-${runId}-a@example.com`);
    check('google_meet confirmation email sent to the booker', !!gMail);
    check('  → contains a REAL Google Meet link', !!gMail && /Meeting link: https:\/\/meet\.google\.com\//.test(gMail.text), gMail?.text.split('\n').find((l) => l.startsWith('Meeting link')) || '');
    check('  → does NOT contain a fake/placeholder link', !!gMail && !/real_oauth_meeting_link_pending|zoom\.us\/j\//.test(gMail.text));

    // 1b. zoom confirmation email — honest "coming soon", no fake link
    const zAptId = await book(zcalId, 'zoom', contactBId, futureWeekday(8, '11:00'));
    emails.length = 0;
    await sendBookingConfirmation(zAptId, { reason: 'booked' });
    const zMail = lastEmailTo(`t65-${runId}-b@example.com`);
    check('zoom confirmation email sent to the booker', !!zMail);
    check('  → NO meeting link line (no fabricated zoom.us URL)', !!zMail && !/Meeting link:/.test(zMail.text));
    check('  → says Zoom integration is coming soon / link to follow', !!zMail && /coming soon/i.test(zMail.text));

    // 2. reschedule → email reflects the NEW time
    const oldStart = futureWeekday(8, '10:00');
    const newStart = futureWeekday(9, '14:00');
    emails.length = 0;
    const rr = await rescheduleAppointmentByToken(generateManageToken(gAptId), newStart);
    check('reschedule via the real manage link succeeded', rr.success === true, JSON.stringify(rr));
    const rMail = lastEmailTo(`t65-${runId}-a@example.com`);
    check('reschedule confirmation email sent', !!rMail);
    const newLabel = `${new Date(newStart).toLocaleString('en-US', { weekday: 'long' })}`;
    check('  → shows the NEW time (14:00) and a "Previous time" line', !!rMail && rMail.text.includes('14:00') && /Previous time:/.test(rMail.text), rMail?.text.split('\n').filter((l) => /time:/i.test(l)).join(' | ') || '');
    // and the real Google event moved
    check('  → the real Google Calendar event was moved to the new time', [...gEvents.values()].some((e) => e.start?.dateTime && new Date(e.start.dateTime).getTime() === new Date(newStart).getTime()));

    // 3. cancel → clearly communicated
    emails.length = 0;
    const cr = await cancelAppointmentByToken(generateManageToken(gAptId));
    check('cancel via the real manage link succeeded', cr.success === true, JSON.stringify(cr));
    const cMail = lastEmailTo(`t65-${runId}-a@example.com`);
    check('cancellation email sent + clearly says the booking is cancelled', !!cMail && /has been cancelled/i.test(cMail.text));
    check('  → the real Google Calendar event was deleted', gEvents.size === 0 || [...gEvents.keys()].every((k) => !k));

    // 4. token security — can't reuse for a different booking
    const swapped = `${zAptId}.${generateManageToken(gAptId).split('.')[1]}`;
    const bad = await getAppointmentByToken(swapped);
    check('token security: a manage token cannot be used for a different appointment', bad.success === false);

    console.log('\n=== PART 2: waitlist offer → accept → expiry ===');

    // group session, effectively full (2/2), waitlist enabled, 2 people waiting
    const { data: session } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: gcalId, user_id: hostId, title: `T65 Group Session ${runId}`,
      start_time: futureWeekday(10, '12:00'), end_time: futureWeekday(10, '13:00'),
      status: 'scheduled', meeting_mode: 'internal_meet', max_attendees: 2, current_attendee_count: 2, waitlist_enabled: true, metadata: {},
    }).select().single();
    aptIds.push(session!.id);
    await db.from('booking_waitlists').insert([
      { workspace_id: workspaceId, appointment_id: session!.id, contact_id: contactAId, position: 1 },
      { workspace_id: workspaceId, appointment_id: session!.id, contact_id: contactBId, position: 2 },
    ]);

    // a spot frees (someone left the session) — decrement fires tr_cancel_promotion
    emails.length = 0;
    await db.from('appointments').update({ current_attendee_count: 1 }).eq('id', session!.id);
    await notifyNewlyOfferedWaitlist(session!.id);

    const { data: offered1 } = await db.from('booking_waitlists').select('id, position, offered_at, offer_expires_at').eq('appointment_id', session!.id).order('position');
    const w1 = offered1!.find((w) => w.position === 1)!;
    check('waitlist person #1 was marked "offered" with an expiry window', !!w1.offered_at && !!w1.offer_expires_at);
    const offerMail = lastEmailTo(`t65-${runId}-a@example.com`);
    check('person #1 received a real offer email', !!offerMail && /spot (has )?opened/i.test(offerMail.text));
    check('  → email contains a working /book/waitlist/<token> accept link', !!offerMail && offerMail.text.includes(`/book/waitlist/${w1.id}.`));

    // accept the offer
    const acceptToken = generateWaitlistToken(w1.id);
    const preview = await getWaitlistOffer(acceptToken);
    check('getWaitlistOffer returns a live, valid offer for the token', preview.success === true);
    emails.length = 0;
    const acc = await acceptWaitlistOffer(acceptToken);
    check('acceptWaitlistOffer succeeded', acc.success === true, JSON.stringify(acc));
    const { data: sessionAfter } = await db.from('appointments').select('current_attendee_count').eq('id', session!.id).single();
    check('  → the session spot was actually claimed (current_attendee_count 1 → 2)', sessionAfter!.current_attendee_count === 2);
    const { data: w1After } = await db.from('booking_waitlists').select('confirmed').eq('id', w1.id).single();
    check('  → person #1 removed from the waitlist (confirmed = true)', w1After!.confirmed === true);
    const confMail = lastEmailTo(`t65-${runId}-a@example.com`);
    check('  → person #1 got a booking-confirmation email (not the session\'s original booker)', !!confMail && /off the waitlist/i.test(confMail.subject));

    // ---- expiry path: free another spot, offer #2, let it lapse, run the cron ----
    await db.from('booking_waitlists').insert({ workspace_id: workspaceId, appointment_id: session!.id, contact_id: contactAId, position: 3 })
      .then(() => {}); // (position 3 = a third waiter; reuse contact A row is fine, UNIQUE is (appointment,contact) so this would fail — use a 3rd contact)
    // actually add a real 3rd contact
    const { data: cC } = await db.from('contacts').insert({ workspace_id: workspaceId, email: `t65-${runId}-c@example.com`, first_name: 'Carol', last_name: 'C' }).select().single();
    await db.from('booking_waitlists').delete().eq('appointment_id', session!.id).eq('contact_id', contactAId).eq('position', 3);
    await db.from('booking_waitlists').insert({ workspace_id: workspaceId, appointment_id: session!.id, contact_id: cC!.id, position: 3 });

    await db.from('appointments').update({ current_attendee_count: 1 }).eq('id', session!.id);
    emails.length = 0;
    await notifyNewlyOfferedWaitlist(session!.id); // offers #2 (Bob)
    const { data: afterOffer2 } = await db.from('booking_waitlists').select('id, position, offered_at, offer_expires_at').eq('appointment_id', session!.id).order('position');
    const w2 = afterOffer2!.find((w) => w.position === 2)!;
    check('after another free-up, person #2 is offered', !!w2.offered_at);

    // lapse #2's offer, run the cron
    await db.from('booking_waitlists').update({ offer_expires_at: new Date(Date.now() - 60_000).toISOString() }).eq('id', w2.id);
    emails.length = 0;
    const cronRes = await advanceExpiredWaitlistOffers();
    check('cron scanned the lapsed offer', cronRes.appointmentsScanned >= 1, JSON.stringify(cronRes));
    const { data: afterCron } = await db.from('booking_waitlists').select('id, position, offered_at, offer_expires_at, confirmed').eq('appointment_id', session!.id).order('position');
    const w3 = afterCron!.find((w) => w.position === 3)!;
    check('  → expired offer advanced to person #3 (fallback behavior, not a silent stuck slot)', !!w3.offered_at && new Date(w3.offer_expires_at!).getTime() > Date.now());
    check('  → person #3 was emailed the offer', !!lastEmailTo(`t65-${runId}-c@example.com`));

    await deleteCalendarConnection(workspaceId, hostId, 'google');
  } finally {
    globalThis.fetch = realFetch;
    if (aptIds.length) {
      await db.from('booking_waitlists').delete().in('appointment_id', aptIds);
      await db.from('appointments').delete().in('id', aptIds);
    }
    if (workspaceId) {
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId);
      await db.from('contacts').delete().eq('workspace_id', workspaceId).like('email', `t65-${runId}-%`);
      await db.from('booking_calendars').delete().in('id', [gcalId, zcalId]);
    }
    await db.auth.admin.deleteUser(hostId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
