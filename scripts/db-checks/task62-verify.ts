/**
 * Task 62 — live DB-level verification.
 *
 * Proves, against the REAL linked Supabase project, that a connected calendar
 * (user_calendar_connections row) flows all the way through to getAvailableSlots
 * and removes a real slot. The only thing faked is the outbound provider HTTP
 * (Google's token + freeBusy endpoints) — that boundary needs a real OAuth
 * consent screen, which is the manual QA handoff. Everything else is real:
 * real DB rows, real getExternalBusySlots, real getAvailableSlots.
 *
 * Run:  npx tsx scripts/db-checks/task62-verify.ts
 * Leaves no data behind (throwaway workspace, deleted in a finally block).
 */
/* eslint-disable no-console -- CLI verification script; console output is the deliverable */
process.env.TZ = 'UTC'; // match Vercel production

import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });

import { randomUUID } from 'crypto';

async function main() {
  const { createAdminClient } = await import('../../src/lib/supabase/server');
  const { storeCalendarConnection } = await import('../../src/lib/calendar/connections');
  const { getAvailableSlots } = await import('../../src/app/actions/calendar/scheduling');
  const db = createAdminClient();

  const runId = randomUUID().slice(0, 8);
  const calendarId = randomUUID();
  let workspaceId = '';

  const results: Array<[string, boolean, string]> = [];
  const check = (name: string, pass: boolean, detail = '') => {
    results.push([name, pass, detail]);
    console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  // pick a weekday ~10 days out
  const d = new Date(Date.now() + 10 * 864e5);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  const date = d.toISOString().split('T')[0];

  const realFetch = globalThis.fetch;

  // Real auth user (public.users.id -> auth.users.id FK).
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email: `t62-${runId}@example.com`,
    password: randomUUID(),
    email_confirm: true,
  });
  if (authErr || !authUser?.user) throw authErr || new Error('could not create auth user');
  const ownerId = authUser.user.id;

  try {
    // A DB trigger (handle_new_user / setup_workspace) auto-creates a workspace
    // + public.users row + owner membership for a new auth user — reuse it.
    await new Promise((r) => setTimeout(r, 800)); // let the trigger settle
    const { data: membership } = await db
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', ownerId)
      .limit(1)
      .maybeSingle();
    if (!membership?.workspace_id) throw new Error('expected an auto-provisioned workspace for the new user');
    workspaceId = membership.workspace_id;
    check('new user auto-provisioned a workspace', true, workspaceId.slice(0, 8));

    // ---- seed a booking calendar in that workspace --------------------------
    const { error: calErr } = await db.from('booking_calendars').insert({
      id: calendarId,
      workspace_id: workspaceId,
      name: `T62 Cal ${runId}`,
      slug: `t62-cal-${runId}`,
      calendar_type: 'personal',
      timezone: 'UTC',
      slot_duration: 60,
      buffer_time: 0,
      availability: Object.fromEntries(['1', '2', '3', '4', '5'].map((k) => [k, [{ start: '09:00', end: '17:00' }]])),
    });
    if (calErr) throw calErr;

    // ---- 1. storeCalendarConnection writes an encrypted, well-formed row -----
    await storeCalendarConnection({
      workspaceId,
      userId: ownerId,
      provider: 'google',
      accessToken: 'live-verify-access-token',
      refreshToken: 'live-verify-refresh-token',
      expiresAt: Date.now() - 1000, // already expired -> forces the refresh path
      email: `connected-${runId}@gmail.com`,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
    });

    const { data: connRow } = await db
      .from('user_calendar_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'google')
      .single();

    check('user_calendar_connections row created', !!connRow);
    check(
      'access token stored encrypted (not plaintext)',
      typeof connRow?.credentials?.access_token_encrypted === 'string' &&
        !JSON.stringify(connRow?.credentials).includes('live-verify-access-token'),
      connRow?.credentials?.access_token_encrypted?.slice(0, 12) + '…'
    );
    check('non-secret metadata (email) stored plaintext for the UI', connRow?.credentials?.email === `connected-${runId}@gmail.com`);

    // ---- 2. workspace_integrations status row synced ------------------------
    const { data: wi } = await db
      .from('workspace_integrations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'Google Calendar')
      .maybeSingle();
    check('workspace_integrations "Google Calendar" flipped to connected', wi?.connected === true, `label=${wi?.account_label}`);

    // ---- 3. baseline: real getAvailableSlots, no external calendar reachable -
    // (the fake token can't refresh -> getExternalBusySlots degrades to [] ->
    //  slots are returned normally). Proves graceful degradation, live.
    globalThis.fetch = (async (url: any, init?: any) => {
      const u = String(url);
      if (u.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 });
      }
      return realFetch(url, init);
    }) as typeof fetch;

    const baseline = await getAvailableSlots(calendarId, date);
    const baseStarts = baseline.map((s: any) => s.start);
    check(
      'graceful degradation: bad/expired token does NOT break slot loading',
      baseline.length > 0 && baseStarts.includes(`${date}T10:00:00.000Z`),
      `${baseline.length} slots`
    );

    // connection flipped to error by the failed refresh
    const { data: afterFail } = await db.from('user_calendar_connections').select('status').eq('id', connRow.id).single();
    check('failed token refresh marked the connection status=error (not silent)', afterFail?.status === 'error');

    // ---- 4. THE PROOF: a real busy block removes exactly the overlapping slot
    // Re-arm the connection and fake Google's token + freeBusy responses so the
    // real getExternalBusySlots returns a real interval into the real
    // getAvailableSlots. Only the HTTP is faked.
    await db.from('user_calendar_connections').update({ status: 'connected' }).eq('id', connRow.id);

    globalThis.fetch = (async (url: any, init?: any) => {
      const u = String(url);
      if (u.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'fresh-live-verify-token', expires_in: 3600 }), { status: 200 });
      }
      if (u.includes('googleapis.com/calendar/v3/freeBusy')) {
        return new Response(
          JSON.stringify({ calendars: { primary: { busy: [{ start: `${date}T10:00:00Z`, end: `${date}T11:00:00Z` }] } } }),
          { status: 200 }
        );
      }
      return realFetch(url, init);
    }) as typeof fetch;

    // getAvailableSlots reads globalThis.fetch at call time — no re-import needed.
    const withBusy = await getAvailableSlots(calendarId, date);
    const busyStarts = withBusy.map((s: any) => s.start);

    check('09:00 slot still available (outside the busy block)', busyStarts.includes(`${date}T09:00:00.000Z`));
    check('10:00 slot REMOVED — blocked by the connected calendar\'s event', !busyStarts.includes(`${date}T10:00:00.000Z`));
    check('11:00 slot still available (busy block ended)', busyStarts.includes(`${date}T11:00:00.000Z`));
    check('exactly one slot removed vs baseline', baseline.length - withBusy.length === 1, `${baseline.length} -> ${withBusy.length}`);

    // ---- 5. disconnect removes the row + clears the status ------------------
    globalThis.fetch = realFetch;
    const { deleteCalendarConnection } = await import('../../src/lib/calendar/connections');
    await deleteCalendarConnection(workspaceId, ownerId, 'google');
    const { data: gone } = await db
      .from('user_calendar_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'google')
      .maybeSingle();
    check('disconnect deletes the user_calendar_connections row', !gone);
    const { data: wi2 } = await db
      .from('workspace_integrations')
      .select('connected')
      .eq('workspace_id', workspaceId)
      .eq('provider', 'Google Calendar')
      .maybeSingle();
    check('disconnect flips workspace_integrations back to not-connected', wi2?.connected === false);

    const slotsAfterDisconnect = await getAvailableSlots(calendarId, date);
    check(
      'after disconnect the 10:00 slot is available again',
      slotsAfterDisconnect.map((s: any) => s.start).includes(`${date}T10:00:00.000Z`)
    );
  } finally {
    globalThis.fetch = realFetch;
    // teardown
    if (workspaceId) {
      await db.from('user_calendar_connections').delete().eq('workspace_id', workspaceId);
      await db.from('workspace_integrations').delete().eq('workspace_id', workspaceId);
      await db.from('booking_calendars').delete().eq('id', calendarId);
    }
    // Deleting the auth user cascades to public.users + the auto-provisioned
    // workspace + memberships via the FKs.
    await db.auth.admin.deleteUser(ownerId).catch(() => {});
    console.log('\n(cleaned up throwaway data)');
  }

  const failed = results.filter(([, p]) => !p);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
