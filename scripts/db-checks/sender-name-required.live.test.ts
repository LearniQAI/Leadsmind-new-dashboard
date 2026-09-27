// Live verification: a sending domain can't be added, verified or saved without a real From name.
//
// Runs the real server actions (@/app/actions/domains) under a REAL signed-in owner session (only
// next/headers is replaced, to hand the user's auth cookies to the server code the way a browser
// request would), against the real database and LeadsMind's real Resend account.
//
// ADMIN (service-role) use, each marked below: login identity provisioning; simulating a LEGACY row
// (a domain added before the name was required — no user path can produce one any more); flipping
// status to 'verified' for the resolver check (real verification needs real DNS); read-only
// assertions; teardown.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { Resend } from 'resend';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);
// Resend refuses example.com subdomains; a unique throwaway .com is created and removed for real.
const DOMAIN = `lmname-${runId}.com`;
const REAL_NAME = 'Name Required Test Co';

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

let admin: any, D: typeof import('@/app/actions/domains'), resend: Resend;
let ws = '', domainId = '';
const userIds: string[] = [];
let ownerEmail = '';

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: {
      get: (n: string) => jar.get(n),
      set: (n: string, v: string) => { jar.set(n, v); },
      remove: (n: string) => { jar.delete(n); },
    },
  });
}
async function signIn(email: string, password: string, workspaceId: string) {
  const jar = new Map<string, string>();
  const { error } = await userClient(jar).auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  jar.set('active_workspace_id', workspaceId);
  return jar;
}

const row = async () =>
  (await admin.from('sender_domains').select('id, from_name, status, last_checked_at, provider_domain_id').eq('workspace_id', ws).maybeSingle()).data; // ADMIN: read-only
const resendHasDomain = async () => ((await resend.domains.list()).data as any)?.data?.some((d: any) => d.name === DOMAIN) ?? false;

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  admin = (await import('@/lib/supabase/server')).createAdminClient();
  D = await import('@/app/actions/domains');
  resend = new Resend(process.env.RESEND_API_KEY!);
  await sweepStaleTestWorkspaces(admin, testRunPatterns('snr'));

  ownerEmail = `snr-${runId}-owner@example.com`;
  const password = `Pw-${randomUUID()}`;
  const { data, error } = await admin.auth.admin.createUser({ email: ownerEmail, password, email_confirm: true }); // ADMIN: identity
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  const jar0 = await signIn(ownerEmail, password, '');
  const { data: m } = await userClient(jar0).from('workspace_members').select('workspace_id, role').eq('user_id', data.user.id).single();
  ws = m.workspace_id;
  expect(['admin', 'owner']).toContain(m.role); // sender domains are admin/owner-only
  activeJar = await signIn(ownerEmail, password, ws);
});

afterAll(async () => {
  // Through the real action first (removes the domain from Resend too), then the workspace.
  if (domainId) await D.deleteSenderDomain(domainId).catch(() => {});
  if (await resendHasDomain().catch(() => false)) {
    const d = ((await resend.domains.list()).data as any).data.find((x: any) => x.name === DOMAIN);
    if (d) await resend.domains.remove(d.id);
  }
  await deleteTestWorkspaces(admin, [ws], userIds); // ADMIN: teardown
});

describe('adding a domain requires a real From name', () => {
  it('the session is real', async () => {
    const { data: { user } } = await userClient(activeJar).auth.getUser();
    expect(user?.email).toBe(ownerEmail);
  });

  it.each([
    ['', /Enter a From name/],
    ['   ', /Enter a From name/],
    ["Snr's Workspace", /default workspace name/],
    ['LeadsMind', /not LeadsMind/],
    ['Test', /placeholder/],
  ])('rejects %j, and nothing is created in the DB or at Resend', async (name, reason) => {
    const res = await D.registerSenderDomain(DOMAIN, name);
    expect(res.error).toMatch(reason);
    expect(res.data).toBeUndefined();
    expect(await row()).toBeNull();
    expect(await resendHasDomain()).toBe(false);
  });

  it('adds the domain with a real name: stored on the row, domain really created at Resend', async () => {
    const res = await D.registerSenderDomain(DOMAIN, `  ${REAL_NAME} `);
    expect(res.error).toBeUndefined();
    domainId = res.data.id;
    const r = await row();
    expect(r.from_name).toBe(REAL_NAME);
    expect(r.provider_domain_id).toBeTruthy();
    expect(await resendHasDomain()).toBe(true);
  });
});

describe('a domain without a real name cannot be verified or have its name cleared', () => {
  it('a legacy nameless domain is refused verification (no provider check runs)', async () => {
    await admin.from('sender_domains').update({ from_name: null }).eq('id', domainId); // ADMIN: simulate a pre-requirement row
    const before = await row();
    const res = await D.verifySenderDomain(domainId);
    expect(res.error).toMatch(/Set a real From name for this domain before verifying it/);
    const after = await row();
    expect(after.last_checked_at).toBe(before.last_checked_at); // refused before asking Resend
    expect(after.status).toBe(before.status);
  });

  it('a placeholder-named domain is refused verification too', async () => {
    await admin.from('sender_domains').update({ from_name: "Snr's Workspace" }).eq('id', domainId); // ADMIN: legacy placeholder
    const res = await D.verifySenderDomain(domainId);
    expect(res.error).toMatch(/default workspace name/);
  });

  it.each([
    ['', /Enter a From name/],
    [null, /Enter a From name/],
    ['Jane’s Workspace', /default workspace name/],
    ['noreply', /placeholder/],
  ])('saving the identity with %j is refused and the name is unchanged', async (name, reason) => {
    const res = await D.updateSenderDomainIdentity(domainId, { fromName: name as any });
    expect(res.error).toMatch(reason);
    expect((await row()).from_name).toBe("Snr's Workspace");
  });

  it('after a real name is saved, verification runs (asks Resend and records the check)', async () => {
    const saved = await D.updateSenderDomainIdentity(domainId, { fromName: REAL_NAME });
    expect(saved.error).toBeUndefined();
    expect((await row()).from_name).toBe(REAL_NAME);
    const before = await row();
    const res = await D.verifySenderDomain(domainId);
    expect(res.error).toBeUndefined();
    const after = await row();
    expect(after.last_checked_at).not.toBe(before.last_checked_at);
    expect(after.status).not.toBe('verified'); // no DNS exists for this throwaway domain
  });

  it('editing only the From address leaves the name alone (no false rejection)', async () => {
    const res = await D.updateSenderDomainIdentity(domainId, { fromLocalPart: 'team' });
    expect(res.error).toBeUndefined();
    expect((await row()).from_name).toBe(REAL_NAME);
  });
});

describe('sending never uses a placeholder display name', () => {
  it('a verified legacy domain with no name and a default workspace name sends as the domain, not the placeholder', async () => {
    const { getMarketingEmailConfig } = await import('@/lib/email/resolveConfig');
    const { data: w } = await admin.from('workspaces').select('name').eq('id', ws).single(); // ADMIN: read-only
    expect(w.name).toMatch(/'s Workspace$/); // the signup default, as for worldteachers.academy
    await admin.from('sender_domains').update({ status: 'verified', from_name: null }).eq('id', domainId); // ADMIN: legacy + DNS stand-in
    expect((await getMarketingEmailConfig(ws))?.fromName).toBe(DOMAIN);
    await admin.from('sender_domains').update({ from_name: REAL_NAME }).eq('id', domainId); // ADMIN
    expect((await getMarketingEmailConfig(ws))?.fromName).toBe(REAL_NAME);
  });
});
