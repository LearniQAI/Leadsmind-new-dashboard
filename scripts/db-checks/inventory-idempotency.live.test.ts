// Live verification of idempotent inventory create, under a REAL signed-in session in Zain Workspace.
//
// The real POST /api/inventory handler runs against the real database with real Supabase auth
// cookies (only next/headers is replaced, to hand those cookies to the server code the way a browser
// request would). Per the "test only in Zain Workspace" rule, the only things created are:
//  - a throwaway auth user (+ its sign-up personal workspace) added as an admin member of Zain Workspace,
//  - inventory rows named `invtest-<runId>-*` in Zain Workspace,
//  - request_timings rows the handler itself writes for its x-request-id values.
// Teardown deletes all of the above and then re-counts to prove nothing is left.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { NextRequest } from 'next/server';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
let activeJar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (name: string) => (activeJar.has(name) ? { name, value: activeJar.get(name)! } : undefined),
    getAll: () => [...activeJar].map(([name, value]) => ({ name, value })),
    set: (a: any, b?: any) => { const n = typeof a === 'string' ? a : a.name; const v = typeof a === 'string' ? b : a.value; if (v) activeJar.set(n, v); else activeJar.delete(n); },
    delete: (name: string) => activeJar.delete(name),
  }),
  headers: () => new Headers(),
}));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));

let admin: any, route: any;
let zainWs = '';
let userId = '';
let personalWs = '';
const requestIds: string[] = [];
const name = (tag: string) => `invtest-${runId}-${tag}`;

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}

async function post(body: Record<string, unknown>) {
  const rid = randomUUID();
  requestIds.push(rid);
  const t0 = performance.now();
  const res = await route.POST(new NextRequest('https://app.test/api/inventory', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': rid },
    body: JSON.stringify(body),
  }));
  return { status: res.status as number, json: await res.json(), ms: Math.round(performance.now() - t0) };
}
const rowsFor = async (tag: string) =>
  (await admin.from('inventory_items').select('id, client_operation_id, name').eq('workspace_id', zainWs).eq('name', name(tag))).data as any[]; // ADMIN: read-only assertion

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  admin = (await import('@/lib/supabase/server')).createAdminClient();
  route = await import('@/app/api/inventory/route');

  const { data: ws } = await admin.from('workspaces').select('id').eq('name', 'Zain Workspace'); // ADMIN: fixture lookup
  if (ws?.length !== 1) throw new Error(`expected exactly one "Zain Workspace", found ${ws?.length}`);
  zainWs = ws[0].id;

  const email = `invtest-${runId}-owner@example.com`;
  const password = `Pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true }); // ADMIN: identity
  if (error) throw new Error(`createUser: ${error.message}`);
  userId = data.user.id;
  await new Promise((r) => setTimeout(r, 1000));
  const { data: owned } = await admin.from('workspaces').select('id').eq('owner_id', userId); // ADMIN: sign-up workspace, removed in teardown
  personalWs = owned?.[0]?.id ?? '';
  // ADMIN: membership of the throwaway user in Zain Workspace (an admin, i.e. an allowed inventory role)
  const { error: mErr } = await admin.from('workspace_members').insert({ workspace_id: zainWs, user_id: userId, role: 'admin' });
  if (mErr) throw new Error(`membership: ${mErr.message}`);

  const jar = new Map<string, string>();
  const { error: sErr } = await userClient(jar).auth.signInWithPassword({ email, password });
  if (sErr) throw new Error(`signIn: ${sErr.message}`);
  jar.set('active_workspace_id', zainWs);
  activeJar = jar;
});

afterAll(async () => {
  const report: string[] = [];
  const { data: inv } = await admin.from('inventory_items').delete().eq('workspace_id', zainWs).like('name', `invtest-${runId}-%`).select('id');
  report.push(`inventory_items deleted: ${inv?.length ?? 0}`);
  await new Promise((r) => setTimeout(r, 1500)); // let waitUntil() timing inserts land before deleting them
  const { data: rt } = await admin.from('request_timings').delete().in('request_id', requestIds).select('id');
  report.push(`request_timings deleted: ${rt?.length ?? 0}`);
  const { data: mem } = await admin.from('workspace_members').delete().eq('workspace_id', zainWs).eq('user_id', userId).select('user_id');
  report.push(`zain membership deleted: ${mem?.length ?? 0}`);
  await deleteTestWorkspaces(admin, personalWs ? [personalWs] : [], [userId]); // ADMIN: teardown
  const left = {
    inventory: (await admin.from('inventory_items').select('id', { count: 'exact', head: true }).eq('workspace_id', zainWs).like('name', `invtest-${runId}-%`)).count,
    timings: (await admin.from('request_timings').select('id', { count: 'exact', head: true }).in('request_id', requestIds)).count,
    members: (await admin.from('workspace_members').select('user_id', { count: 'exact', head: true }).eq('user_id', userId)).count,
    users: (await admin.auth.admin.getUserById(userId)).data?.user ? 1 : 0,
  };
  console.log('TEARDOWN', report.join(' | '), '| remaining:', JSON.stringify(left));
  expect(left).toEqual({ inventory: 0, timings: 0, members: 0, users: 0 });
});

describe('idempotent inventory create (real session, Zain Workspace)', () => {
  it('creates once, and a repeat with the same client_operation_id returns the SAME row with no new insert', async () => {
    const op = randomUUID();
    const body = { name: name('replay'), sku: `S-${runId}`, quantity_in_stock: 3, client_operation_id: op };
    const first = await post(body);
    expect(first.status).toBe(200);
    expect(first.json.replayed).toBeUndefined();
    const second = await post(body);
    expect(second.status).toBe(200);
    expect(second.json.replayed).toBe(true);
    expect(second.json.inventoryItem.id).toBe(first.json.inventoryItem.id);
    expect(await rowsFor('replay')).toHaveLength(1);
    console.log(`TIMING first=${first.ms}ms replay=${second.ms}ms`);
  });

  it('12 concurrent submits with one operation id (the original bug) produce exactly ONE row', async () => {
    const op = randomUUID();
    const body = { name: name('burst'), sku: `B-${runId}`, client_operation_id: op };
    const results = await Promise.all(Array.from({ length: 12 }, () => post(body)));
    expect(results.map((r) => `${r.status}${r.json.error ? ":" + r.json.error : ""}`)).toEqual(Array(12).fill("200"));
    expect(new Set(results.map((r) => r.json.inventoryItem.id)).size).toBe(1);
    expect(await rowsFor('burst')).toHaveLength(1);
  });

  it('different operation ids still create separate rows, and a missing id keeps the legacy behaviour', async () => {
    const a = await post({ name: name('multi'), client_operation_id: randomUUID() });
    const b = await post({ name: name('multi'), client_operation_id: randomUUID() });
    const c = await post({ name: name('multi') });
    const d = await post({ name: name('multi') });
    expect([a, b, c, d].map((r) => `${r.status}${r.json.error ? ":" + r.json.error : ""}`)).toEqual(["200", "200", "200", "200"]);
    expect(await rowsFor('multi')).toHaveLength(4);
  });

  it('rejects a malformed client_operation_id and a non-object body with 400', async () => {
    expect((await post({ name: name('bad'), client_operation_id: 'not-a-uuid' })).status).toBe(400);
    expect((await post({ name: name('bad'), client_operation_id: 42 })).status).toBe(400);
    expect(await rowsFor('bad')).toHaveLength(0);
  });

  it('SKU uniqueness: a different item reusing a SKU (any case/whitespace) is a 409; blank SKUs are exempt; PATCH clashes are 409', async () => {
    const sku = `U-${runId}`;
    const a = await post({ name: name('sku-a'), sku, client_operation_id: randomUUID() });
    expect(a.status).toBe(200);
    const clash = await post({ name: name('sku-b'), sku: ` ${sku.toLowerCase()} `, client_operation_id: randomUUID() });
    expect(clash.status).toBe(409);
    expect(clash.json.code).toBe('CONFLICT');
    expect(await rowsFor('sku-b')).toHaveLength(0);
    // a genuine replay of the first create still returns the original row, not a conflict
    const replayOp = randomUUID();
    const r1 = await post({ name: name('sku-r'), sku: `R-${runId}`, client_operation_id: replayOp });
    const r2 = await post({ name: name('sku-r'), sku: `R-${runId}`, client_operation_id: replayOp });
    expect([r1.status, r2.status]).toEqual([200, 200]);
    expect(r2.json.inventoryItem.id).toBe(r1.json.inventoryItem.id);
    // blank / missing SKUs never collide
    const blanks = await Promise.all([post({ name: name('blank'), sku: '' }), post({ name: name('blank'), sku: '  ' }), post({ name: name('blank') })]);
    expect(blanks.every((r) => r.status === 200)).toBe(true);
    // PATCH onto another item's SKU
    const other = await post({ name: name('sku-p'), sku: `P-${runId}` });
    const res = await route.PATCH(new NextRequest(`https://app.test/api/inventory?id=${other.json.inventoryItem.id}`, {
      method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sku }),
    }));
    expect(res.status).toBe(409);
  });

  it('records per-step timings for the POST', async () => {
    await new Promise((r) => setTimeout(r, 1500));
    const { data } = await admin.from('request_timings').select('status, duration_ms, steps').in('request_id', requestIds); // ADMIN: read-only
    console.log('TIMINGS rows', data?.length, JSON.stringify((data ?? []).slice(0, 3)));
  });
});
