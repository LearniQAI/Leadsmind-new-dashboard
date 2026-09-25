// Live verification: sender_domains / global_suppression_list / email_tracking_logs RLS lockdown
// (migration 20260930000003) + real-DNS sender-domain verification.
// Real database, real Supabase Auth sessions (signInWithPassword), throwaway workspaces. Every
// client-side write below goes through PostgREST with the user's own JWT, exactly as a browser would.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const runId = randomUUID().slice(0, 8);

let db: any, admin: any, member: any, ws = '';
const userIds: string[] = [];
let domainId = '', suppressionId = '', logId = '';

async function mkUser(tag: string) {
  const email = `emlk-${runId}-${tag}-owner@example.com`;
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

const domainCampaign = async () => (await db.from('email_campaigns').select('id').eq('workspace_id', ws).limit(1).single()).data.id;
const domainRow = async () => (await db.from('sender_domains').select('*').eq('id', domainId).single()).data;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('emlk'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const a = await mkUser('a');
  admin = a.client;
  ws = (await db.from('workspace_members').select('workspace_id, role').eq('user_id', a.id).single()).data.workspace_id;
  const m = await mkUser('m');
  member = m.client;
  const { error: joinErr } = await db.from('workspace_members').insert({ workspace_id: ws, user_id: m.id, role: 'member' });
  if (joinErr) throw new Error(`member join: ${joinErr.message}`);

  // Seed one row per table with the service role (the only legitimate writer of status/log rows).
  domainId = (await db.from('sender_domains').insert({ workspace_id: ws, domain_name: `rls-${runId}.example.com` }).select().single()).data.id;
  suppressionId = (await db.from('global_suppression_list').insert({ workspace_id: ws, email: `optout-${runId}@example.com`, reason: 'unsubscribe' }).select().single()).data.id;
  const campaignId = (await db.from('email_campaigns').insert({ workspace_id: ws, name: `rls-${runId}`, subject: 'rls' }).select().single()).data.id;
  const log = await db.from('email_tracking_logs').insert({ workspace_id: ws, campaign_id: campaignId, event_type: 'open' }).select().single();
  if (log.error) throw new Error(`seed tracking log: ${log.error.message}`);
  logId = log.data.id;
});

afterAll(async () => {
  await deleteTestWorkspaces(db, [ws], userIds);
});

describe('plain member: read-only', () => {
  it('can still read all three tables', async () => {
    expect((await member.from('sender_domains').select('id').eq('id', domainId)).data).toHaveLength(1);
    expect((await member.from('global_suppression_list').select('id').eq('id', suppressionId)).data).toHaveLength(1);
    expect((await member.from('email_tracking_logs').select('id').eq('id', logId)).data).toHaveLength(1);
  });

  it('cannot flip sender_domains spf/dkim/dmarc status to verified', async () => {
    const res = await member.from('sender_domains')
      .update({ spf_status: true, dkim_status: true, dmarc_status: true, verified_at: new Date().toISOString() })
      .eq('id', domainId).select();
    expect(res.data ?? []).toHaveLength(0);
    expect(await domainRow()).toMatchObject({ spf_status: false, dkim_status: false, dmarc_status: false, verified_at: null });
  });

  it('cannot insert a pre-verified (or any) sender domain, nor delete one', async () => {
    const pre = await member.from('sender_domains').insert({ workspace_id: ws, domain_name: `m-${runId}.example.com`, spf_status: true, dkim_status: true });
    expect(pre.error).toBeTruthy();
    const plain = await member.from('sender_domains').insert({ workspace_id: ws, domain_name: `m2-${runId}.example.com` });
    expect(plain.error).toBeTruthy();
    const del = await member.from('sender_domains').delete().eq('id', domainId).select();
    expect(del.data ?? []).toHaveLength(0);
    expect(await domainRow()).toBeTruthy();
  });

  it('cannot delete or alter an unsubscribe row, nor add one', async () => {
    const del = await member.from('global_suppression_list').delete().eq('id', suppressionId).select();
    expect(del.data ?? []).toHaveLength(0);
    const upd = await member.from('global_suppression_list').update({ email: 'changed@example.com' }).eq('id', suppressionId).select();
    expect(upd.data ?? []).toHaveLength(0);
    const row = (await db.from('global_suppression_list').select('email').eq('id', suppressionId).single()).data;
    expect(row.email).toBe(`optout-${runId}@example.com`);
    const ins = await member.from('global_suppression_list').insert({ workspace_id: ws, email: `m-${runId}@example.com` });
    expect(ins.error).toBeTruthy();
  });

  it('cannot forge, alter or delete tracking events', async () => {
    expect((await member.from('email_tracking_logs').insert({ workspace_id: ws, campaign_id: (await domainCampaign()), event_type: 'click' })).error).toBeTruthy();
    expect((await member.from('email_tracking_logs').update({ event_type: 'complaint' }).eq('id', logId).select()).data ?? []).toHaveLength(0);
    expect((await member.from('email_tracking_logs').delete().eq('id', logId).select()).data ?? []).toHaveLength(0);
    expect((await db.from('email_tracking_logs').select('event_type').eq('id', logId).single()).data.event_type).toBe('open');
  });
});

describe('workspace admin: sending domains are server-only (they also create/remove the provider domain)', () => {
  it('cannot flip status, insert, or delete sender_domains from the browser', async () => {
    const res = await admin.from('sender_domains').update({ spf_status: true, dkim_status: true, status: 'verified' }).eq('id', domainId).select();
    expect(res.data ?? []).toHaveLength(0);
    expect(await domainRow()).toMatchObject({ spf_status: false, dkim_status: false, status: 'not_started' });
    const ins = await admin.from('sender_domains').insert({ workspace_id: ws, domain_name: `a-${runId}.example.com` });
    expect(ins.error).toBeTruthy();
    const del = await admin.from('sender_domains').delete().eq('id', domainId).select();
    expect(del.data ?? []).toHaveLength(0);
    expect(await domainRow()).toBeTruthy();
  });

  it('can add a suppression but cannot remove an opt-out', async () => {
    expect((await admin.from('global_suppression_list').insert({ workspace_id: ws, email: `a-${runId}@example.com`, reason: 'manual' })).error).toBeNull();
    expect((await admin.from('global_suppression_list').delete().eq('id', suppressionId).select()).data ?? []).toHaveLength(0);
  });

  it('has no client access at all to the BYO Resend key table, the send limits, or the quota counters', async () => {
    const byo = await admin.from('workspace_email_providers').insert({ workspace_id: ws, provider: 'resend', encrypted_api_key: 'x', from_email: 'a@b.com' });
    expect(byo.error).toBeTruthy();
    await db.from('workspace_email_providers').insert({ workspace_id: ws, provider: 'resend', encrypted_api_key: 'enc', from_email: 'a@b.com' });
    expect((await admin.from('workspace_email_providers').select('*').eq('workspace_id', ws)).data ?? []).toHaveLength(0);
    expect((await member.from('workspace_email_providers').update({ from_email: 'evil@x.com' }).eq('workspace_id', ws).select()).data ?? []).toHaveLength(0);
    await db.from('workspace_email_providers').delete().eq('workspace_id', ws);

    // A workspace must not be able to raise its own sending cap.
    expect((await admin.from('email_sending_limits').upsert({ workspace_id: ws, hourly_limit: 1_000_000 })).error).toBeTruthy();
    expect((await admin.from('email_send_quota').select('*')).data ?? []).toHaveLength(0);
    expect((await admin.rpc('claim_email_send_quota', { p_scopes: [`ws:${ws}`], p_windows: ['hour'], p_limits: [1] })).error).toBeTruthy();
  });
});
