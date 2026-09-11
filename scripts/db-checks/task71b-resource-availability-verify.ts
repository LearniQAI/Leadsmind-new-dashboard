/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

// Follow-up to Task 71: real-time resource availability wired into
// BookingModal's picker. Core proof:
//   1. a booked room shows unavailable for an overlapping time
//   2. the SAME room shows available again for a non-overlapping time
//   3. a genuine race (booked AFTER the picker already loaded "available")
//      is still rejected by the real DB constraint at submit — the live
//      picker is a UX convenience, NOT a replacement for the guarantee.
//   4. normal (no-resource) booking is unaffected.
//
// computeResourceAvailability (the exact query logic getResourceAvailability's
// requireWorkspaceAccess()-gated action calls) is exercised directly against
// the live DB via the admin client — a bare script has no real session/cookie
// context to satisfy that auth gate, same reasoning Task 71's own verify
// script used. The auth-gated action itself is untouched.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { computeResourceAvailability } = await import('../../src/app/actions/calendar/resources');
  const { isResourceConflictError, isSlotConflictError } = await import('../../src/lib/calendar/bookingErrors');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };

  const { data: authUser } = await db.auth.admin.createUser({ email: `t71b-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const aptIds: string[] = [];
  const resourceIds: string[] = [];

  const wk = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };

  const mkApt = async (label: string, startIso: string, endIso: string, resourceId: string | null) => {
    const { data, error } = await db
      .from('appointments')
      .insert({
        workspace_id: workspaceId, calendar_id: null, title: `T71b ${label} ${runId}`,
        start_time: startIso, end_time: endIso, status: 'scheduled', meeting_mode: 'internal_meet',
        resource_id: resourceId, metadata: {},
      })
      .select()
      .single();
    if (!error) aptIds.push(data!.id);
    return { data, error };
  };

  try {
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;

    const { data: room } = await db
      .from('resources')
      .insert({ workspace_id: workspaceId, name: `Boardroom ${runId}`, type: 'room', created_by: ownerId })
      .select()
      .single();
    resourceIds.push(room!.id);
    const { data: desk } = await db
      .from('resources')
      .insert({ workspace_id: workspaceId, name: `Desk 4 ${runId}`, type: 'desk', created_by: ownerId })
      .select()
      .single();
    resourceIds.push(desk!.id);

    const bookedStart = wk(8, '10:00');
    const bookedEnd = wk(8, '10:30');

    // ---- 0. before any booking: both resources show available ----
    const before = await computeResourceAvailability(db, workspaceId, bookedStart, bookedEnd);
    check('before any booking: both resources show available', before.every((r: any) => r.available === true), JSON.stringify(before));

    // ---- 1. book the room for a real slot ----
    const b1 = await mkApt('booked', bookedStart, bookedEnd, room!.id);
    check('the room is booked for a real appointment', !b1.error && b1.data?.resource_id === room!.id, b1.error?.message);

    // ---- 2. picker re-check for an OVERLAPPING time: the room shows unavailable ----
    const overlapStart = wk(8, '10:15');
    const overlapEnd = wk(8, '10:45');
    const overlapView = await computeResourceAvailability(db, workspaceId, overlapStart, overlapEnd);
    const roomInOverlap = overlapView.find((r: any) => r.id === room!.id);
    const deskInOverlap = overlapView.find((r: any) => r.id === desk!.id);
    check('★ picker check for an OVERLAPPING time: the booked room shows unavailable', roomInOverlap?.available === false, JSON.stringify(roomInOverlap));
    check('  → the OTHER resource (desk) still shows available at the same time', deskInOverlap?.available === true);

    // ---- 3. picker re-check for a NON-overlapping time: the room shows available again ----
    const laterStart = wk(8, '14:00');
    const laterEnd = wk(8, '14:30');
    const laterView = await computeResourceAvailability(db, workspaceId, laterStart, laterEnd);
    const roomLater = laterView.find((r: any) => r.id === room!.id);
    check('★ picker check for a DIFFERENT, non-overlapping time: the same room shows available again', roomLater?.available === true, JSON.stringify(roomLater));

    // ---- 4. editing the booked appointment itself: excludeAppointmentId means it doesn't self-conflict ----
    const selfView = await computeResourceAvailability(db, workspaceId, bookedStart, bookedEnd, b1.data!.id);
    const roomSelf = selfView.find((r: any) => r.id === room!.id);
    check('editing the SAME appointment (excludeAppointmentId) does not show its own room as unavailable', roomSelf?.available === true);

    // ---- 5. CORE REGRESSION PROOF: a genuine race is still caught by the real DB constraint ----
    // Simulate: the picker already loaded "available" for a fresh slot (nobody
    // has booked it yet) -> a moment later, a DIFFERENT booking takes that
    // exact resource+time (the race) -> the original submit must still be
    // rejected by appointments_resource_no_overlap, not silently allowed
    // through because the picker said "available" a moment earlier.
    const raceStart = wk(9, '11:00');
    const raceEnd = wk(9, '11:30');
    const preRaceView = await computeResourceAvailability(db, workspaceId, raceStart, raceEnd);
    const roomPreRace = preRaceView.find((r: any) => r.id === room!.id);
    check('pre-race: the picker shows the room as available for the fresh slot', roomPreRace?.available === true);

    // the race: someone else's booking lands first
    const racer = await mkApt('racer-won', raceStart, raceEnd, room!.id);
    check('  → a concurrent booking for that exact room+time succeeds first (the race winner)', !racer.error, racer.error?.message);

    // the original submit — as if the user clicked "Book" using the now-stale
    // "available" reading the picker showed them a moment ago
    const raceLoser = await mkApt('racer-lost', raceStart, raceEnd, room!.id);
    check('★★ the ORIGINAL submit is still REJECTED by the real DB constraint (not silently allowed)', !!raceLoser.error, JSON.stringify(raceLoser.data));
    check('  → rejected specifically by appointments_resource_no_overlap', isResourceConflictError(raceLoser.error));
    check('  → correctly distinguished from the calendar-slot conflict', !isSlotConflictError(raceLoser.error));

    // ---- 6. regression: normal (no-resource) booking is completely unaffected ----
    const plain = await mkApt('no-resource', wk(10, '09:00'), wk(10, '09:30'), null);
    check('normal booking with NO resource selected still succeeds unaffected', !plain.error, plain.error?.message);
    const plainView = await computeResourceAvailability(db, workspaceId, wk(10, '09:00'), wk(10, '09:30'));
    check('  → an appointment with no resource_id does not occupy any resource in the availability view', plainView.every((r: any) => r.available === true));
  } finally {
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (resourceIds.length) await db.from('resources').delete().in('id', resourceIds);
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
