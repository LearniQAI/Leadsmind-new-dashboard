// Live verification: user_calendar_connections owner-only RLS (migration 20260930000006).
// Real database, real Supabase Auth sessions (signInWithPassword), a throwaway workspace with two members.
// Every client-side call goes through PostgREST with the user's own JWT, exactly as a browser would.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const runId = randomUUID().slice(0, 8);

let db: any, ws = '';
let owner: { id: string; client: any }, member: { id: string; client: any };
const userIds: string[] = [];
let ownerRowId = '', memberRowId = '';

async function mkUser(tag: string) {
  const email = `ucc-${runId}-${tag}-owner@example.com`;
  const password = randomUUID();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 800));
  const client = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`signIn: ${signInError.message}`);
  return { id: data.user.id as string, client };
}

const creds = (label: string) => ({ access_token_encrypted: `enc-${label}`, refresh_token_encrypted: `enc-r-${label}`, email: `${label}@example.com` });
const rowById = async (id: string) => (await db.from('user_calendar_connections').select('*').eq('id', id).maybeSingle()).data;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('ucc'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  owner = await mkUser('a');
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', owner.id).single()).data.workspace_id;
  member = await mkUser('m');
  const { error: joinErr } = await db.from('workspace_members').insert({ workspace_id: ws, user_id: member.id, role: 'member' });
  if (joinErr) throw new Error(`member join: ${joinErr.message}`);

  const a = await db.from('user_calendar_connections')
    .insert({ workspace_id: ws, user_id: owner.id, provider: 'google', status: 'connected', credentials: creds('owner') }).select().single();
  if (a.error) throw new Error(`seed owner row: ${a.error.message}`);
  ownerRowId = a.data.id;
  const m = await db.from('user_calendar_connections')
    .insert({ workspace_id: ws, user_id: member.id, provider: 'google', status: 'connected', credentials: creds('member') }).select().single();
  if (m.error) throw new Error(`seed member row: ${m.error.message}`);
  memberRowId = m.data.id;
});

afterAll(async () => {
  await deleteTestWorkspaces(db, [ws], userIds);
});

describe('a second member cannot touch a colleague\'s connection', () => {
  it('cannot read it, and a workspace-wide select returns only their own row', async () => {
    expect((await member.client.from('user_calendar_connections').select('id').eq('id', ownerRowId)).data).toHaveLength(0);
    const all = (await member.client.from('user_calendar_connections').select('id, user_id').eq('workspace_id', ws)).data;
    expect(all).toEqual([{ id: memberRowId, user_id: member.id }]);
  });

  it('cannot overwrite its credentials or status', async () => {
    const res = await member.client.from('user_calendar_connections')
      .update({ credentials: creds('hijack'), status: 'error' }).eq('id', ownerRowId).select();
    expect(res.data ?? []).toHaveLength(0);
    expect(await rowById(ownerRowId)).toMatchObject({ status: 'connected', credentials: creds('owner'), user_id: owner.id });
  });

  it('cannot delete it', async () => {
    const res = await member.client.from('user_calendar_connections').delete().eq('id', ownerRowId).select();
    expect(res.data ?? []).toHaveLength(0);
    expect(await rowById(ownerRowId)).toBeTruthy();
  });

  it('cannot insert a row claiming the colleague\'s user_id', async () => {
    const res = await member.client.from('user_calendar_connections')
      .insert({ workspace_id: ws, user_id: owner.id, provider: 'zoom', status: 'connected', credentials: creds('forged') });
    expect(res.error).toBeTruthy();
    expect((await db.from('user_calendar_connections').select('id').eq('user_id', owner.id).eq('provider', 'zoom')).data).toHaveLength(0);
  });

  it('cannot hand their own row over to the colleague (WITH CHECK on update)', async () => {
    const res = await member.client.from('user_calendar_connections').update({ user_id: owner.id }).eq('id', memberRowId).select();
    expect(res.error || (res.data ?? []).length === 0).toBeTruthy();
    expect((await rowById(memberRowId)).user_id).toBe(member.id);
  });

  it('the workspace OWNER cannot read or modify a member\'s connection either (owner-only, not admin-visible)', async () => {
    expect((await owner.client.from('user_calendar_connections').select('id').eq('id', memberRowId)).data).toHaveLength(0);
    expect((await owner.client.from('user_calendar_connections').delete().eq('id', memberRowId).select()).data ?? []).toHaveLength(0);
    expect(await rowById(memberRowId)).toBeTruthy();
  });

  it('anon has no access at all', async () => {
    const anon = createClient(URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
    const res = await anon.from('user_calendar_connections').select('id').eq('workspace_id', ws);
    expect(res.error || (res.data ?? []).length === 0).toBeTruthy();
  });
});

describe('the connection owner keeps full access to their own row', () => {
  it('can read, update, insert and delete their own rows', async () => {
    const read = await owner.client.from('user_calendar_connections').select('id, credentials').eq('id', ownerRowId);
    expect(read.data).toEqual([{ id: ownerRowId, credentials: creds('owner') }]);

    const upd = await owner.client.from('user_calendar_connections').update({ status: 'error' }).eq('id', ownerRowId).select('status');
    expect(upd.data).toEqual([{ status: 'error' }]);

    const ins = await owner.client.from('user_calendar_connections')
      .insert({ workspace_id: ws, user_id: owner.id, provider: 'zoom', status: 'connected', credentials: creds('owner-zoom') }).select('id').single();
    expect(ins.error).toBeNull();

    const del = await owner.client.from('user_calendar_connections').delete().eq('id', ins.data.id).select('id');
    expect(del.data).toEqual([{ id: ins.data.id }]);
  });
});

describe('server-side (service role) store helpers are unaffected', () => {
  it('storeCalendarConnection / getCalendarConnection / listWorkspaceCalendarConnections still work across users', async () => {
    const conn = await import('@/lib/calendar/connections');
    await conn.storeCalendarConnection({
      workspaceId: ws, userId: member.id, provider: 'google',
      accessToken: 'live-access', refreshToken: 'live-refresh', expiresAt: Date.now() + 3_600_000, email: 'member@example.com', scope: 'openid',
    });
    const got = await conn.getCalendarConnection(member.id, 'google');
    expect(got?.credentials).toMatchObject({ accessToken: 'live-access', refreshToken: 'live-refresh', email: 'member@example.com' });

    const listed = await conn.listWorkspaceCalendarConnections(ws);
    expect(listed.map((r: any) => r.userId ?? r.user_id).sort()).toEqual([member.id, owner.id].sort());
  });
});
