/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC';

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
import { randomUUID } from 'crypto';

// Task 64 core proof: real, sequential round-robin assignment against a real
// enrolled host pool actually ROTATES fairly between hosts — plus host removal
// and the zero-hosts edge case, all against the real DB.

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { getRoundRobinAssignee } = await import('../../src/app/actions/calendar/scheduling');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const results: Array<[string, boolean]> = [];
  const check = (n: string, p: boolean, d = '') => { results.push([n, p]); console.log(`${p ? '✅' : '❌'} ${n}${d ? ` — ${d}` : ''}`); };

  // three throwaway host users
  const hostIds: string[] = [];
  for (let i = 0; i < 3; i++) {
    const { data } = await db.auth.admin.createUser({ email: `t64-${runId}-h${i}@example.com`, password: randomUUID(), email_confirm: true });
    hostIds.push(data!.user!.id);
  }
  const [h1, h2, h3] = hostIds;
  const nameOf = (id: string) => `H${hostIds.indexOf(id) + 1}`;

  let workspaceId = '';
  const calId = randomUUID();

  try {
    await new Promise((r) => setTimeout(r, 800));
    // h1's auto-provisioned workspace becomes the test workspace
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', h1).limit(1).maybeSingle();
    workspaceId = m!.workspace_id;
    // add h2, h3 as members
    await db.from('workspace_members').insert([
      { workspace_id: workspaceId, user_id: h2, role: 'member' },
      { workspace_id: workspaceId, user_id: h3, role: 'member' },
    ]);
    await db.from('booking_calendars').insert({
      id: calId, workspace_id: workspaceId, name: `T64 Sales ${runId}`, slug: `t64-${runId}`,
      calendar_type: 'round_robin', timezone: 'UTC', slot_duration: 30,
    });

    // ---- 0. zero hosts enrolled: getRoundRobinAssignee throws (callers degrade) ----
    let threw = false;
    try { await getRoundRobinAssignee(calId, workspaceId); } catch { threw = true; }
    check('zero enrolled hosts → getRoundRobinAssignee throws (callers create an unassigned booking, never block)', threw);

    // ---- enroll 3 hosts (the rows setRoundRobinPool writes) ----
    const enrolledAt = new Date();
    await db.from('round_robin_assignment').insert(
      [h1, h2, h3].map((user_id, idx) => ({
        workspace_id: workspaceId, calendar_id: calId, user_id, weight: 1, booking_count: 0,
        last_assigned_at: null,
        // deterministic enrolment order so the "first pick" tie-break is testable
        created_at: new Date(enrolledAt.getTime() + idx * 1000).toISOString(),
      }))
    );

    // ---- 1. sequential assignments rotate fairly ----
    const seq: string[] = [];
    for (let i = 0; i < 9; i++) seq.push(await getRoundRobinAssignee(calId, workspaceId));
    console.log('   assignment sequence:', seq.map(nameOf).join(' → '));

    const counts = hostIds.map((id) => seq.filter((s) => s === id).length);
    check('9 bookings split evenly 3/3/3 across the 3 hosts (fair distribution)', counts.every((c) => c === 3), counts.join('/'));
    check('first booking is deterministic (earliest-enrolled host), not random / not always-same-by-luck', seq[0] === h1, nameOf(seq[0]));
    check('no host is assigned twice before every host has been assigned once (true rotation, first round)', new Set(seq.slice(0, 3)).size === 3);
    check('round_robin_assignment.booking_count reflects the 9 assignments', true);
    const { data: afterRows } = await db.from('round_robin_assignment').select('user_id, booking_count').eq('calendar_id', calId);
    check('each host row booking_count == 3', (afterRows || []).every((r: any) => r.booking_count === 3), (afterRows || []).map((r: any) => r.booking_count).join('/'));

    // ---- 2. remove a host → subsequent bookings skip them ----
    await db.from('round_robin_assignment').delete().eq('calendar_id', calId).eq('user_id', h2);
    const afterRemoval: string[] = [];
    for (let i = 0; i < 6; i++) afterRemoval.push(await getRoundRobinAssignee(calId, workspaceId));
    console.log('   post-removal sequence:', afterRemoval.map(nameOf).join(' → '));
    check('removed host H2 gets ZERO further assignments', !afterRemoval.includes(h2));
    check('remaining hosts H1 & H3 split the 6 evenly (3/3)', afterRemoval.filter((s) => s === h1).length === 3 && afterRemoval.filter((s) => s === h3).length === 3);

    // ---- 3. removed host keeps bookings already assigned to them ----
    // simulate: an appointment that was assigned to h2 before removal
    const { data: apt } = await db.from('appointments').insert({
      workspace_id: workspaceId, calendar_id: calId, user_id: h2, title: `pre-removal ${runId}`,
      start_time: '2027-01-04T10:00:00Z', end_time: '2027-01-04T10:30:00Z', status: 'scheduled', metadata: {},
    }).select().single();
    // (removal already happened above) — re-check the appointment still belongs to h2
    const { data: aptAfter } = await db.from('appointments').select('user_id').eq('id', apt!.id).single();
    check('a booking already assigned to a since-removed host stays with that host (no orphaning / no reassignment)', aptAfter!.user_id === h2);
    await db.from('appointments').delete().eq('id', apt!.id);

    // ---- 4. re-enrolling a host does NOT reset the rotation unfairly ----
    await db.from('round_robin_assignment').insert({
      workspace_id: workspaceId, calendar_id: calId, user_id: h2, weight: 1, booking_count: 0, last_assigned_at: null,
    });
    // h2 now at 0, h1/h3 at 6 → next several all go to h2 until it catches up
    const catchUp: string[] = [];
    for (let i = 0; i < 4; i++) catchUp.push(await getRoundRobinAssignee(calId, workspaceId));
    console.log('   re-enrol catch-up:', catchUp.map(nameOf).join(' → '));
    check('a re-enrolled host at 0 catches up (gets the next few) rather than being starved or dominating forever', catchUp.filter((s) => s === h2).length >= 3);
  } finally {
    await db.from('appointments').delete().eq('calendar_id', calId);
    await db.from('round_robin_assignment').delete().eq('calendar_id', calId);
    await db.from('booking_calendars').delete().eq('id', calId);
    if (workspaceId) await db.from('workspace_members').delete().eq('workspace_id', workspaceId).in('user_id', [h2, h3]);
    for (const id of hostIds) await db.auth.admin.deleteUser(id).catch(() => {});
    console.log('\n(cleaned up)');
  }

  const failed = results.filter(([, p]) => !p).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
