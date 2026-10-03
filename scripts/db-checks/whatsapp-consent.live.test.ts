// Live verification of Consent Engine CE1 (consent tables, suppression, revoke triggers, wa_record_consent, wa_marketing_eligible)
// under REAL signed-in sessions, an anonymous client and the service role, in throwaway workspaces (deleted in afterAll with proof).
// NOTHING is sent to anyone: this test never calls a messaging provider. All numbers are fake +1555... numbers.
// The two real WhatsApp connections and every pre-existing row are never read or modified.
//
//   npx vitest run --config scripts/db-checks/vitest.live.config.ts scripts/db-checks/whatsapp-consent.live.test.ts
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { randomUUID } from 'crypto';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import { createServerClient as ssrClient } from '@supabase/ssr';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';

const runId = randomUUID().slice(0, 8);

vi.mock('next/headers', () => ({ cookies: () => ({ get: () => undefined, getAll: () => [], set: () => {}, delete: () => {} }), headers: () => new Headers() }));
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));
vi.mock('react', async (orig: any) => { const r = await orig(); const c = (fn: any) => fn; return { ...r, default: { ...(r.default ?? r), cache: c }, cache: c }; });

let admin: any, anon: any, memberA: any, E: any, C: any, S: any;
let wsA = '', wsB = '', wsC = '';
const userIds: string[] = [];
const TABLES = ['whatsapp_consent_records', 'whatsapp_consent_events', 'whatsapp_suppressions'];
const num = (n: number) => `+15550${String(5000000 + n).padStart(7, '0')}`;
let seq = 0;

function userClient(jar: Map<string, string>) {
  return ssrClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { flowType: 'pkce' },
    cookies: { get: (n: string) => jar.get(n), set: (n: string, v: string) => { jar.set(n, v); }, remove: (n: string) => { jar.delete(n); } },
  });
}
async function mkUser(tag: string) {
  const email = `wcons-${runId}-${tag}-owner@example.com`; const password = randomUUID();
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userIds.push(data.user.id);
  await new Promise((r) => setTimeout(r, 1000));
  const ws = (await admin.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).limit(1).maybeSingle()).data.workspace_id as string;
  const jar = new Map<string, string>();
  const client = userClient(jar);
  const { error: se } = await client.auth.signInWithPassword({ email, password });
  if (se) throw new Error(`signIn: ${se.message}`);
  return { ws, client, userId: data.user.id as string };
}
const mkContact = async (ws: string, phone: string | null, extra: any = {}) => {
  const { data, error } = await admin.from('contacts').insert({ workspace_id: ws, email: `wcons-${runId}-${++seq}@example.com`, first_name: `C${seq}`, last_name: 'T', phone, ...extra }).select().single();
  if (error) throw new Error(`contact: ${error.message}`);
  return data as { id: string; phone_e164: string | null };
};
const consentArgs = (ws: string, contactId: string | null, phone: string, over: any = {}) => ({
  p_workspace: ws, p_contact_id: contactId, p_phone_e164: phone, p_status: 'ACTIVE', p_source_type: 'live_test', p_source_id: null,
  p_source_url: 'https://example.test/optin', p_form_version_id: null, p_consent_text: 'I agree to WhatsApp marketing from ACME.',
  p_consent_text_version: '1.0', p_terms_version: '2.1', p_privacy_version: '4.0', p_consented_at: new Date().toISOString(),
  p_timezone: 'Africa/Johannesburg', p_ip_hash: 'h', p_user_agent: 'live-test', p_actor: 'live-test', ...over,
});
const record = async (ws: string, contactId: string | null, phone: string, over: any = {}) => {
  const { data, error } = await admin.rpc('wa_record_consent', consentArgs(ws, contactId, phone, over));
  if (error) throw new Error(`wa_record_consent: ${error.message}`);
  return data as string;
};
const eligible = async (ws: string, ids?: string[]) => {
  const r = await E.getEligibleContactIds(ws, ids ?? null);
  if (!r.ok) throw new Error('eligibility failed closed unexpectedly');
  return r.contactIds as string[];
};
const consentRows = async (ws: string, phone: string) => (await admin.from('whatsapp_consent_records').select('*').eq('workspace_id', ws).eq('phone_e164', phone)).data as any[];
const countTable = async (t: string, ws: string[]) => (await admin.from(t).select('id', { count: 'exact', head: true }).in('workspace_id', ws)).count as number;

beforeAll(async () => {
  admin = (await import('@/lib/supabase/server')).createAdminClient();
  E = await import('@/lib/whatsapp/eligibility');
  C = await import('@/lib/whatsapp/consent/recordConsent');
  S = await import('@/lib/smsOptOut');
  anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const swept = await sweepStaleTestWorkspaces(admin, testRunPatterns('wcons'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s)`);
  const a = await mkUser('a'); wsA = a.ws; memberA = a.client;
  const b = await mkUser('b'); wsB = b.ws;
  const c = await mkUser('c'); wsC = c.ws;
}, 240_000);

afterAll(async () => {
  if (!admin) return;
  await deleteTestWorkspaces(admin, [wsA, wsB, wsC], userIds); // throws (fails the run) if anything is left
  const ws = [wsA, wsB, wsC];
  const remaining = await Promise.all([
    admin.from('workspaces').select('id', { count: 'exact', head: true }).in('id', ws),
    admin.from('contacts').select('id', { count: 'exact', head: true }).like('email', `wcons-${runId}-%`),
    admin.from('whatsapp_consent_records').select('id', { count: 'exact', head: true }),
    admin.from('whatsapp_consent_events').select('id', { count: 'exact', head: true }),
    admin.from('whatsapp_suppressions').select('id', { count: 'exact', head: true }),
    admin.from('sms_suppression_list').select('id', { count: 'exact', head: true }).in('workspace_id', ws),
    admin.from('tags').select('id', { count: 'exact', head: true }).in('workspace_id', ws),
  ]);
  const { data: lu } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = (lu?.users ?? []).filter((u: any) => u.email?.startsWith(`wcons-${runId}-`)).length;
  console.log(`CLEANUP PROOF remaining: workspaces=${remaining[0].count} contacts=${remaining[1].count} consentRecords(all)=${remaining[2].count} consentEvents(all)=${remaining[3].count} suppressions(all)=${remaining[4].count} smsSuppression=${remaining[5].count} tags=${remaining[6].count} authUsers=${users}`);
  for (const r of remaining) expect(r.count).toBe(0);
  expect(users).toBe(0);
}, 300_000);

describe('(a) clients are denied on every new table and function; the service role works', () => {
  for (const who of ['member', 'anon'] as const) {
    const client = () => (who === 'member' ? memberA : anon);
    for (const t of TABLES) {
      it(`${who}: SELECT, INSERT, UPDATE and DELETE on ${t} are denied`, async () => {
        const c = client();
        const sel = await c.from(t).select('id').limit(1);
        expect(sel.error, `${who} select ${t}`).toBeTruthy();
        expect(sel.data ?? []).toHaveLength(0);
        const ins = await c.from(t).insert({ workspace_id: wsA, phone_e164: num(1), reason: 'ADMIN_BLOCK' });
        expect(ins.error, `${who} insert ${t}`).toBeTruthy();
        const upd = await c.from(t).update({ source: 'x' }).eq('workspace_id', wsA);
        expect(upd.error, `${who} update ${t}`).toBeTruthy();
        const del = await c.from(t).delete().eq('workspace_id', wsA);
        expect(del.error, `${who} delete ${t}`).toBeTruthy();
      });
    }
    it(`${who}: EXECUTE on wa_record_consent, wa_marketing_eligible and wa_revoke_consent is denied`, async () => {
      const c = client();
      const r1 = await c.rpc('wa_record_consent', consentArgs(wsA, null, num(2)));
      const r2 = await c.rpc('wa_marketing_eligible', { p_workspace: wsA, p_contact_ids: null });
      const r3 = await c.rpc('wa_revoke_consent', { p_workspace: wsA, p_phone: num(2), p_reason: 'ADMIN_BLOCK', p_source: 'x' });
      for (const r of [r1, r2, r3]) { expect(r.error).toBeTruthy(); expect(r.data ?? null).toBeNull(); }
      expect(await countTable('whatsapp_consent_records', [wsA])).toBe(0);
    });
  }

  it('service role can read, insert and call the functions', async () => {
    for (const t of TABLES) expect((await admin.from(t).select('id').limit(1)).error).toBeNull();
    expect((await admin.rpc('wa_marketing_eligible', { p_workspace: wsA, p_contact_ids: null })).error).toBeNull();
  });
});

describe('(b) eligibility needs an ACTIVE consent for this workspace and the contact\'s current number', () => {
  it('opted_in=true with no consent is NOT eligible; after ACTIVE consent it is; a phone change voids it', async () => {
    const c = await mkContact(wsA, num(10));
    expect(c.phone_e164).toBe(num(10));
    expect((await admin.from('contacts').select('opted_in').eq('id', c.id).single()).data.opted_in).toBe(true); // the legacy default
    expect(await eligible(wsA, [c.id])).toEqual([]);

    expect(await record(wsA, c.id, num(10))).toBe('created');
    expect(await eligible(wsA, [c.id])).toEqual([c.id]);

    await admin.from('contacts').update({ phone: num(11) }).eq('id', c.id);
    expect(await eligible(wsA, [c.id])).toEqual([]); // consent is bound to the number, not the contact

    await admin.from('contacts').update({ phone: num(10) }).eq('id', c.id);
    expect(await eligible(wsA, [c.id])).toEqual([c.id]); // the same number again: the same consent applies
  });

  it('a contact imported or inserted with a number that has NO consent is not eligible', async () => {
    const x = await mkContact(wsA, num(20));
    expect(await eligible(wsA, [x.id])).toEqual([]);
    const viaMember = await memberA.from('contacts').insert({ workspace_id: wsA, email: `wcons-${runId}-m${++seq}@example.com`, first_name: 'M', last_name: 'M', phone: num(21), opted_in: true, consent_timestamp: new Date().toISOString(), source: 'csv' }).select('id').single();
    expect(viaMember.error).toBeNull();
    expect(await eligible(wsA, [viaMember.data.id])).toEqual([]);
  });

  it('DESIGN NOTE: consent belongs to the NUMBER, so a second contact on a consented number is eligible too (the audience layer de-duplicates by number)', async () => {
    const first = await mkContact(wsA, num(30));
    expect(await record(wsA, first.id, num(30))).toBe('created');
    const dup = await mkContact(wsA, num(30));
    expect((await eligible(wsA, [first.id, dup.id])).sort()).toEqual([first.id, dup.id].sort());
  });
});

describe('(c) no member write can create eligibility', () => {
  it('flags, tags (even a system-looking one) and any contacts column written by a member change nothing', async () => {
    const c = await mkContact(wsA, num(40), { opted_in: false });
    // A real SYSTEM tag with the reserved-looking name (created with the service role: members cannot insert tag_type 'system', but
    // the existing RLS lets a member ASSIGN any non-private tag, and could retype their own). The tag must never be read for eligibility.
    const tag = await admin.from('tags').insert({ workspace_id: wsA, name: 'WHATSAPP_MARKETING_ELIGIBLE', tag_type: 'system' }).select('id').single();
    expect(tag.error).toBeNull();
    const assign = await memberA.from('tag_assignments').insert({ workspace_id: wsA, tag_id: tag.data.id, entity_type: 'contact', entity_id: c.id });
    expect(assign.error).toBeNull();
    const upd = await memberA.from('contacts').update({
      opted_in: true, opted_out: false, sms_opt_out: false, consent_timestamp: new Date().toISOString(), consent_ip: '203.0.113.9',
      processing_purpose_scope: 'whatsapp marketing', tags: ['WHATSAPP_MARKETING_ELIGIBLE'], metadata: { whatsapp_marketing_eligible: true },
    }).eq('id', c.id);
    expect(upd.error).toBeNull();
    expect(await eligible(wsA, [c.id])).toEqual([]);
    expect(await consentRows(wsA, num(40))).toHaveLength(0);
  });
});

describe('(d) opt-outs revoke consent; deliverability suppression does not', () => {
  it('a real STOP through recordSmsOptOut revokes consent, writes a suppression row and removes eligibility', async () => {
    const c = await mkContact(wsA, num(50));
    expect(await record(wsA, c.id, num(50))).toBe('created');
    expect(await eligible(wsA, [c.id])).toEqual([c.id]);

    const res = await S.recordSmsOptOut(admin, { workspaceId: wsA, phone: num(50), source: 'live_test_stop', messageSid: `sid-${runId}` });
    expect(res.e164).toBe(num(50));

    const rows = await consentRows(wsA, num(50));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'REVOKED', revoke_reason: 'USER_OPTED_OUT' });
    expect(rows[0].revoked_at).toBeTruthy();
    const supp = (await admin.from('whatsapp_suppressions').select('reason,source').eq('workspace_id', wsA).eq('phone_e164', num(50))).data;
    expect(supp.map((s: any) => s.reason)).toContain('USER_OPTED_OUT');
    const ev = (await admin.from('whatsapp_consent_events').select('event').eq('consent_id', rows[0].id)).data.map((e: any) => e.event);
    expect(ev).toEqual(expect.arrayContaining(['created', 'revoked']));
    expect(await eligible(wsA, [c.id])).toEqual([]);
  });

  it('an SMS invalid-number suppression excludes the contact but does NOT revoke consent', async () => {
    const c = await mkContact(wsA, num(60));
    expect(await record(wsA, c.id, num(60))).toBe('created');
    const ins = await admin.from('sms_suppression_list').insert({ workspace_id: wsA, phone_e164: num(60), reason: 'invalid_number', source: 'live_test_twilio_30008' });
    expect(ins.error).toBeNull();
    expect(await eligible(wsA, [c.id])).toEqual([]);
    expect((await consentRows(wsA, num(60)))[0].status).toBe('ACTIVE');
    expect((await admin.from('whatsapp_suppressions').select('id').eq('workspace_id', wsA).eq('phone_e164', num(60))).data).toHaveLength(0);
    // a later real STOP on the same number upgrades the row (UPDATE) and now revokes
    await S.recordSmsOptOut(admin, { workspaceId: wsA, phone: num(60), source: 'live_test_stop2' });
    expect((await consentRows(wsA, num(60)))[0].status).toBe('REVOKED');
  });

  it('setting contacts.opted_out through a MEMBER client revokes consent', async () => {
    const c = await mkContact(wsA, num(70));
    expect(await record(wsA, c.id, num(70))).toBe('created');
    expect(await eligible(wsA, [c.id])).toEqual([c.id]);
    const upd = await memberA.from('contacts').update({ opted_out: true }).eq('id', c.id);
    expect(upd.error).toBeNull();
    expect((await consentRows(wsA, num(70)))[0]).toMatchObject({ status: 'REVOKED', revoke_reason: 'USER_OPTED_OUT' });
    expect(await eligible(wsA, [c.id])).toEqual([]);
  });

  it('a member cannot bring the number back by clearing the flag again', async () => {
    const c = await mkContact(wsA, num(71));
    await record(wsA, c.id, num(71));
    await memberA.from('contacts').update({ sms_opt_out: true }).eq('id', c.id);
    await memberA.from('contacts').update({ opted_out: false, sms_opt_out: false, opted_in: true }).eq('id', c.id);
    expect(await eligible(wsA, [c.id])).toEqual([]); // consent stays REVOKED
    expect((await consentRows(wsA, num(71)))[0].status).toBe('REVOKED');
  });

  it('an opt-out flag on ANY contact sharing the number excludes every contact on it', async () => {
    const one = await mkContact(wsA, num(72));
    await record(wsA, one.id, num(72));
    const two = await mkContact(wsA, num(72), { sms_opt_out: true });
    expect(await eligible(wsA, [one.id, two.id])).toEqual([]);
  });
});

describe('(e) wa_record_consent rules', () => {
  it('a previously opted-out number is refused and nothing is written; the refusal is permanent', async () => {
    const c = await mkContact(wsA, num(80));
    await record(wsA, c.id, num(80));
    await S.recordSmsOptOut(admin, { workspaceId: wsA, phone: num(80), source: 'live_test_stop' });
    const before = { rec: await countTable('whatsapp_consent_records', [wsA]), ev: await countTable('whatsapp_consent_events', [wsA]), sup: await countTable('whatsapp_suppressions', [wsA]) };
    expect(await record(wsA, c.id, num(80))).toBe('previously_opted_out');
    // even after START lifts the SMS opt-out, WhatsApp consent is not restored by this function
    await S.clearSmsOptOut(admin, { workspaceId: wsA, phone: num(80) });
    expect(await record(wsA, c.id, num(80))).toBe('previously_opted_out');
    expect({ rec: await countTable('whatsapp_consent_records', [wsA]), ev: await countTable('whatsapp_consent_events', [wsA]), sup: await countTable('whatsapp_suppressions', [wsA]) }).toEqual(before);
    expect(await eligible(wsA, [c.id])).toEqual([]);
  });

  it('a number with only an SMS STOP row (no WhatsApp history) is refused too', async () => {
    await admin.from('sms_suppression_list').insert({ workspace_id: wsA, phone_e164: num(81), reason: 'stop_keyword', source: 'live_test' });
    const c = await mkContact(wsA, num(81));
    expect(await record(wsA, c.id, num(81))).toBe('previously_opted_out');
    expect(await consentRows(wsA, num(81))).toHaveLength(0);
  });

  it('twice returns already_active; other codes behave', async () => {
    const c = await mkContact(wsA, num(82));
    expect(await record(wsA, c.id, num(82))).toBe('created');
    expect(await record(wsA, c.id, num(82))).toBe('already_active');
    expect(await consentRows(wsA, num(82))).toHaveLength(1);
    expect(await record(wsA, null, 'not a number')).toBe('invalid_phone');
    expect(await record(wsA, c.id, num(83), { p_status: 'REVOKED' })).toBe('invalid_input');
    expect(await record(wsA, c.id, num(83), { p_consent_text: ' ' })).toBe('invalid_input');
    expect(await record(wsA, randomUUID(), num(83))).toBe('invalid_contact');
    const other = await mkContact(wsB, num(84));
    expect(await record(wsA, other.id, num(83))).toBe('invalid_contact'); // another workspace's contact
    expect(await consentRows(wsA, num(83))).toHaveLength(0);
  });

  it('PENDING_VERIFICATION is not eligible; activating it makes it eligible', async () => {
    const c = await mkContact(wsA, num(85));
    expect(await record(wsA, c.id, num(85), { p_status: 'PENDING_VERIFICATION' })).toBe('created');
    expect(await record(wsA, c.id, num(85), { p_status: 'PENDING_VERIFICATION' })).toBe('already_pending');
    expect(await eligible(wsA, [c.id])).toEqual([]);
    expect(await record(wsA, c.id, num(85))).toBe('activated');
    expect(await eligible(wsA, [c.id])).toEqual([c.id]);
  });

  it('eight concurrent calls create exactly one live record', async () => {
    const c = await mkContact(wsA, num(86));
    const results = await Promise.all(Array.from({ length: 8 }, () => record(wsA, c.id, num(86))));
    expect(results.filter((r) => r === 'created')).toHaveLength(1);
    expect(results.filter((r) => r === 'already_active')).toHaveLength(7);
    const rows = await consentRows(wsA, num(86));
    expect(rows.filter((r) => ['ACTIVE', 'PENDING_VERIFICATION'].includes(r.status))).toHaveLength(1);
    expect(rows).toHaveLength(1);
  });

  it('the TypeScript wrapper maps the same codes', async () => {
    const c = await mkContact(wsA, num(87));
    const input = { workspaceId: wsA, contactId: c.id, phone: num(87), status: 'ACTIVE' as const, sourceType: 'live_test', consentText: 'I agree to WhatsApp marketing from ACME.', consentTextVersion: '1.0', consentedAt: new Date() };
    expect(await C.recordWhatsAppConsent(input)).toEqual({ ok: true, code: 'created' });
    expect(await C.recordWhatsAppConsent(input)).toEqual({ ok: true, code: 'already_active' });
    expect(await C.recordWhatsAppConsent({ ...input, phone: 'garbage' })).toEqual({ ok: false, code: 'invalid_phone' });
  });
});

describe('(f) the evidence is immutable', () => {
  it('UPDATE of consent_text or consented_at is rejected; status and revoked fields may change; REVOKED never goes live again', async () => {
    const c = await mkContact(wsA, num(90));
    await record(wsA, c.id, num(90));
    const id = (await consentRows(wsA, num(90)))[0].id;

    const t = await admin.from('whatsapp_consent_records').update({ consent_text: 'something else entirely' }).eq('id', id);
    expect(t.error?.message).toMatch(/immutable/);
    const d = await admin.from('whatsapp_consent_records').update({ consented_at: new Date(Date.now() - 86400000).toISOString() }).eq('id', id);
    expect(d.error?.message).toMatch(/immutable/);
    const p = await admin.from('whatsapp_consent_records').update({ phone_e164: num(91) }).eq('id', id);
    expect(p.error?.message).toMatch(/immutable/);
    const w = await admin.from('whatsapp_consent_records').update({ workspace_id: wsB }).eq('id', id);
    expect(w.error?.message).toMatch(/immutable/);

    const ok = await admin.from('whatsapp_consent_records').update({ status: 'REVOKED', revoked_at: new Date().toISOString(), revoke_reason: 'ADMIN_BLOCK' }).eq('id', id);
    expect(ok.error).toBeNull();
    const back = await admin.from('whatsapp_consent_records').update({ status: 'ACTIVE' }).eq('id', id);
    expect(back.error?.message).toMatch(/never become live again/);
    expect((await consentRows(wsA, num(90)))[0].consent_text).toBe('I agree to WhatsApp marketing from ACME.');
  });
});

describe('(g) tenant isolation', () => {
  it("A's consent never makes the same number eligible in B, and foreign ids return nothing", async () => {
    const a = await mkContact(wsA, num(100));
    const b = await mkContact(wsB, num(100));
    expect(await record(wsA, a.id, num(100))).toBe('created');
    expect(await eligible(wsA, [a.id])).toEqual([a.id]);
    expect(await eligible(wsB, [b.id])).toEqual([]);
    expect(await eligible(wsB)).toEqual([]);
    expect(await eligible(wsA, [b.id])).toEqual([]); // asking for A with B's contact id
    expect(await eligible(wsB, [a.id])).toEqual([]); // asking for B with A's contact id
    expect(await eligible(wsA, [a.id, b.id])).toEqual([a.id]);
    // an STOP in B never touches A's consent
    await S.recordSmsOptOut(admin, { workspaceId: wsB, phone: num(100), source: 'live_test_stop' });
    expect((await consentRows(wsA, num(100)))[0].status).toBe('ACTIVE');
    expect(await eligible(wsA, [a.id])).toEqual([a.id]);
  });

  it('existing workspaces without consent records have an empty eligible set (no backfill)', async () => {
    const r = await admin.rpc('wa_marketing_eligible', { p_workspace: wsB, p_contact_ids: null });
    expect(r.data).toEqual([]);
  });
});

describe('(h) 5,000-contact timing and plan', () => {
  it('wa_marketing_eligible over 5,000 contacts (2,500 with active consent)', async () => {
    const N = 5000; const CONSENTED = 2500;
    const ids: string[] = [];
    const inserted: { id: string; phone_e164: string }[] = [];
    for (let i = 0; i < N; i += 500) {
      const batch = Array.from({ length: Math.min(500, N - i) }, (_, k) => ({ workspace_id: wsC, email: `wcons-${runId}-big${i + k}@example.com`, first_name: `B${i + k}`, last_name: 'T', phone: num(200000 + i + k) }));
      const { data, error } = await admin.from('contacts').insert(batch).select('id,phone_e164');
      if (error) throw new Error(`bulk contacts: ${error.message}`);
      ids.push(...data.map((d: any) => d.id));
      inserted.push(...data);
    }
    // consents for the first half, inserted by the service role directly (fixture only)
    expect((await admin.from('contacts').select('id', { count: 'exact', head: true }).eq('workspace_id', wsC)).count).toBe(N);
    const withConsent = inserted.slice(0, CONSENTED);
    for (let i = 0; i < withConsent.length; i += 500) {
      const rows = withConsent.slice(i, i + 500).map((c: any) => ({ workspace_id: wsC, contact_id: c.id, phone_e164: c.phone_e164, status: 'ACTIVE', source_type: 'live_test_bulk', consent_text: 'I agree.', consent_text_version: '1.0', consented_at: new Date().toISOString() }));
      const { error } = await admin.from('whatsapp_consent_records').insert(rows);
      if (error) throw new Error(`bulk consents: ${error.message}`);
    }
    // 100 of the consented numbers are suppressed, 50 have an opt-out flag
    const suppressed = withConsent.slice(0, 100).map((c: any) => ({ workspace_id: wsC, phone_e164: c.phone_e164, reason: 'ADMIN_BLOCK', source: 'live_test_bulk' }));
    expect((await admin.from('whatsapp_suppressions').insert(suppressed)).error).toBeNull();
    await admin.from('contacts').update({ sms_opt_out: true }).in('id', withConsent.slice(100, 150).map((c: any) => c.id));

    const planText = (out: string) => (JSON.parse(out.slice(out.indexOf('{'))).rows as any[]).map((r) => Object.values(r)[0]).join('\n');
    const bodySql = `select c.id, c.phone_e164, cr.id from public.whatsapp_consent_records cr cross join lateral (select c0.id, c0.phone_e164 from public.contacts c0 where c0.workspace_id = cr.workspace_id and c0.phone_e164 = cr.phone_e164 offset 0) c where cr.workspace_id = '${wsC}' and cr.consent_type = 'MARKETING_WHATSAPP' and cr.status = 'ACTIVE' and (select 1 from public.whatsapp_suppressions s where s.workspace_id = cr.workspace_id and s.phone_e164 = cr.phone_e164 limit 1) is null and (select 1 from public.sms_suppression_list l where l.workspace_id = cr.workspace_id and l.phone_e164 = cr.phone_e164 limit 1) is null and (select 1 from public.contacts d where d.workspace_id = cr.workspace_id and d.phone_e164 = cr.phone_e164 and (d.opted_out is true or d.sms_opt_out is true) limit 1) is null`;
    let fnMs = -1;
    try {
      // Measurements FIRST (they must be printed even if a threshold below fails). Fresh fixture: no ANALYZE has run, so this is
      // also the worst case for planner statistics.
      const fnOut = execSync(`supabase db query --linked -o json "${("explain (analyze, costs off) select count(*) from public.wa_marketing_eligible('" + wsC + "'::uuid, null)").replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
      const txt = planText(fnOut);
      console.log('EXPLAIN ANALYZE of the function call itself:\n' + txt);
      const planOut = execSync(`supabase db query --linked -o json "${('explain (analyze, buffers, costs off) ' + bodySql).replace(/"/g, '\\"')}"`, { encoding: 'utf8', timeout: 180000, stdio: ['ignore', 'pipe', 'pipe'] });
      console.log('EXPLAIN (ANALYZE, BUFFERS) of the function body on the 5,000-contact fixture (statistics NOT refreshed):\n' + planText(planOut));
      const m = /Execution Time: ([0-9.]+) ms/.exec(txt);
      fnMs = m ? Number(m[1]) : -1;
    } catch (e: any) {
      console.log(`EXPLAIN could not be captured through the CLI: ${String(e.message).slice(0, 300)}`);
    }

    const t0 = Date.now();
    const all = await E.getEligibleContactIds(wsC);
    const msAll = Date.now() - t0;
    expect(all.ok).toBe(true);
    expect(all.contactIds).toHaveLength(CONSENTED - 150);
    expect(new Set(all.contactIds).size).toBe(CONSENTED - 150);

    const t1 = Date.now();
    const some = await E.getEligibleContactIds(wsC, ids.slice(0, 1000));
    const msSome = Date.now() - t1;
    expect(some.ok).toBe(true);
    console.log(`TIMING wa_marketing_eligible: function execution=${fnMs}ms server-side; via wrapper (includes network and ${Math.ceil(all.contactIds.length / 1000)} pages): all=${msAll}ms (${all.contactIds.length} eligible of ${N}), 1000 ids=${msSome}ms (${some.contactIds.length} eligible)`);
    if (fnMs >= 0) expect(fnMs).toBeLessThan(2000);
    expect(msAll).toBeLessThan(30000);
  }, 600_000);
});
