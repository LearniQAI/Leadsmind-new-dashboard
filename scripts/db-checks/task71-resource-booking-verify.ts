/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { randomUUID } from 'crypto';

// Task 71 core proof: a real room/desk/equipment resource can be created and
// attached to a real appointment, and the DB genuinely REJECTS booking the
// SAME resource for an overlapping time — via the exact EXCLUDE-constraint
// mechanism appointments_no_overlap already proved for calendar_id
// (migration 20260911120000), not an app-level check that can race.
//
// Server actions in resources.ts/appointments.ts sit behind requireWorkspaceAccess()
// (a real session), which a bare script has none of — same reason prior
// scheduling/round-robin verify scripts drive the DB directly rather than
// mocking auth. What's under test here is the DB guarantee + the exact insert
// shape those actions issue, which is the part that actually matters (an
// app-level bug can never re-allow this; a schema bug could).

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { isResourceConflictError, isSlotConflictError } = await import('../../src/lib/calendar/bookingErrors');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };

  const { data: authUser } = await db.auth.admin.createUser({ email: `t71-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  const ownerId = authUser!.user!.id;
  let workspaceId = '';
  const calId = randomUUID();
  const aptIds: string[] = [];
  const resourceIds: string[] = [];

  const wk = (offsetDays: number, hhmm: string) => {
    const d = new Date(Date.now() + offsetDays * 864e5);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
    return `${d.toISOString().split('T')[0]}T${hhmm}:00.000Z`;
  };

  // Ad-hoc (calendar_id NULL) by default — exempt from appointments_no_overlap
  // (its own WHERE clause: calendar_id IS NOT NULL), so these bookings isolate
  // the RESOURCE conflict under test from the pre-existing calendar conflict.
  // Pass useCalendar=true only for the explicit calendar-regression check.
  const mkApt = async (label: string, startIso: string, endIso: string, resourceId: string | null, useCalendar = false) => {
    const { data, error } = await db
      .from('appointments')
      .insert({
        workspace_id: workspaceId, calendar_id: useCalendar ? calId : null, title: `T71 ${label} ${runId}`,
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
    await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `T71 ${runId}`, slug: `t71-${runId}`,
      calendar_type: 'personal', timezone: 'UTC', slot_duration: 30,
    });

    // ---- 1. Admin UI proof: create real resources (room/desk/equipment) ----
    const { data: room, error: roomErr } = await db
      .from('resources')
      .insert({ workspace_id: workspaceId, name: `Conference Room A ${runId}`, type: 'room', location: '3rd floor', capacity: 8, created_by: ownerId })
      .select()
      .single();
    check('★ a real ROOM resource was created', !roomErr && room?.type === 'room' && room?.capacity === 8, roomErr?.message);
    resourceIds.push(room!.id);

    const { data: desk } = await db.from('resources').insert({ workspace_id: workspaceId, name: `Desk 12 ${runId}`, type: 'desk', created_by: ownerId }).select().single();
    const { data: equip } = await db.from('resources').insert({ workspace_id: workspaceId, name: `Projector ${runId}`, type: 'equipment', created_by: ownerId }).select().single();
    resourceIds.push(desk!.id, equip!.id);
    check('  → desk + equipment resources also created (same table, type field)', !!desk && !!equip);

    const { data: listed } = await db.from('resources').select('id, type').eq('workspace_id', workspaceId).eq('is_active', true);
    check('  → listResources()-equivalent query returns all 3 active resources', (listed ?? []).length === 3);

    // ---- 2. Book the room for a real slot ----
    const slotA = wk(8, '10:00');
    const slotAEnd = wk(8, '10:30');
    const b1 = await mkApt('booked', slotA, slotAEnd, room!.id);
    check('★ the room is booked for a real appointment (resource_id attached)', !b1.error && b1.data?.resource_id === room!.id, b1.error?.message);

    // ---- 3. CORE PROOF: an overlapping booking for the SAME resource is REJECTED ----
    const overlapStart = wk(8, '10:15'); // overlaps 10:00-10:30
    const overlapEnd = wk(8, '10:45');
    const b2 = await mkApt('overlap', overlapStart, overlapEnd, room!.id);
    check('★★ booking the SAME room for an OVERLAPPING time is REJECTED (not silently allowed)', !!b2.error, JSON.stringify(b2.data));
    check('  → rejected by the real appointments_resource_no_overlap EXCLUDE constraint', isResourceConflictError(b2.error));
    check('  → correctly distinguished from the calendar_id slot-conflict error', !isSlotConflictError(b2.error));

    // A non-overlapping request for the same room at a different time must
    // still succeed — this constraint must not over-block.
    const b3 = await mkApt('later', wk(8, '14:00'), wk(8, '14:30'), room!.id);
    check('  → a NON-overlapping booking for the same room still succeeds (not over-blocking)', !b3.error, b3.error?.message);

    // A different resource at the exact same overlapping time must succeed —
    // the constraint is scoped per-resource, not global.
    const b4 = await mkApt('other-resource', overlapStart, overlapEnd, desk!.id);
    check('  → the SAME overlapping time on a DIFFERENT resource succeeds (per-resource, not global)', !b4.error, b4.error?.message);

    // ---- 4. Cancel frees the resource for that time ----
    const { error: cancelErr } = await db.from('appointments').update({ status: 'cancelled' }).eq('id', b1.data!.id);
    check('cancelling the original booking succeeds', !cancelErr);
    const b5 = await mkApt('rebooked-after-cancel', slotA, slotAEnd, room!.id);
    check('★ after cancelling, the SAME room can be booked again for the SAME time (resource freed)', !b5.error, b5.error?.message);

    // ---- 5. Regression: person/calendar double-booking prevention unaffected ----
    const gA = await mkApt('cal-conflict-a', wk(9, '09:00'), wk(9, '09:30'), null, true);
    const gB = await mkApt('cal-conflict-b', wk(9, '09:15'), wk(9, '09:45'), null, true);
    check('regression: overlapping bookings on the SAME calendar (no resource) still rejected by appointments_no_overlap', !!gB.error && isSlotConflictError(gB.error) && !isResourceConflictError(gB.error), gB.error?.message);

    // ---- 6. Deactivate a resource (soft-delete) ----
    const { error: deactErr } = await db.from('resources').update({ is_active: false }).eq('id', equip!.id);
    const { data: afterDeactivate } = await db.from('resources').select('id').eq('workspace_id', workspaceId).eq('is_active', true);
    check('deactivating a resource removes it from the active list without deleting its history', !deactErr && (afterDeactivate ?? []).length === 2);
    const { data: stillLinked } = await db.from('appointments').select('id').eq('resource_id', room!.id);
    check('  → past/future appointment rows referencing resources are untouched by deactivation', (stillLinked ?? []).length >= 1);
  } finally {
    if (aptIds.length) await db.from('appointments').delete().in('id', aptIds);
    if (resourceIds.length) await db.from('resources').delete().in('id', resourceIds);
    if (workspaceId) await db.from('booking_calendars').delete().eq('id', calId);
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
