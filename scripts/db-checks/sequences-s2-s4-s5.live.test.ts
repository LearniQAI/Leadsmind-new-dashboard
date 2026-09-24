// Live verification for Email Sequences S2 (edit-safe atomic save), S4 (claim/reclaim/retry) and
// S5 (bounce/complaint attribution). Real code + real database, inside throwaway workspaces.
// Only the outbound Resend HTTP call is intercepted (recorded, never delivered).
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';
import { randomUUID, randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const h = vi.hoisted(() => ({ workspaceId: '', userClient: null as any }));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, getCurrentWorkspaceId: async () => h.workspaceId, requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: 'live-test' }), requireAuth: async () => ({}) };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.userClient };
});
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

const SECRET = `whsec_${randomBytes(24).toString('base64')}`;
process.env.RESEND_WEBHOOK_SECRET = SECRET;

type Sent = { to: string; subject: string; tags: Record<string, string>; idem: string | null; delivered: boolean };
const sent: Sent[] = [];
const behavior = new Map<string, string[]>(); // recipient -> outcomes for successive attempts ('ok' | '500' | '422')
let sendDelayMs = 0;
const realFetch = globalThis.fetch;

let db: any, ws = '', ws2 = '';
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);
const email = (t: string) => `s245-${runId}-${t}@example.com`;
let M: any; // dynamically imported modules

const mkContact = async (tag: string, workspace = ws) =>
  (await db.from('contacts').insert({ workspace_id: workspace, email: email(tag), first_name: `T${tag}`, last_name: 'V' }).select().single()).data;

async function mkWorkflow(name: string, trigger: string, specs: Array<{ type: string; config: any }>, source: string | null = 'email_sequence', active = false) {
  const { data: wf, error } = await db.from('workflows').insert({ workspace_id: ws, name, trigger_type: trigger, trigger_config: {}, is_active: active, source }).select().single();
  if (error) throw new Error(error.message);
  const ids: string[] = [];
  for (let i = 0; i < specs.length; i++) {
    const { data: s, error: se } = await db.from('workflow_steps').insert({ workflow_id: wf.id, workspace_id: ws, position: i + 1, type: specs[i].type, config: specs[i].config }).select('id').single();
    if (se) throw new Error(se.message);
    ids.push(s.id);
  }
  for (let i = 0; i < ids.length - 1; i++) await db.from('workflow_edges').insert({ workflow_id: wf.id, workspace_id: ws, source_step_id: ids[i], target_step_id: ids[i + 1], source_handle: 'next' });
  return { wf, ids };
}
const twoEmail = (l: string) => [
  { type: 'send_email', config: { subject: `${l}-E1`, body: 'one' } },
  { type: 'wait', config: { delayValue: 1, delayUnit: 'days' } },
  { type: 'send_email', config: { subject: `${l}-E2`, body: 'two' } },
];
const mkExec = async (wfId: string, contactId: string, stepId: string | null, patch: any = {}) =>
  (await db.from('workflow_executions').insert({ workspace_id: ws, workflow_id: wfId, contact_id: contactId, status: 'running', current_step_id: stepId, started_at: new Date(Date.now() - 10 * 60e3).toISOString(), ...patch }).select().single()).data;
const exec = async (id: string) => (await db.from('workflow_executions').select('*').eq('id', id).single()).data;
const forceDue = (id: string) => db.from('workflow_executions').update({ context: { resume_at: new Date(Date.now() - 60e3).toISOString() }, next_attempt_at: null }).eq('id', id);
const subjectsTo = (to: string) => sent.filter((s) => s.to === to && s.delivered).map((s) => s.subject);

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;

  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url).includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      const to = Array.isArray(b.to) ? b.to[0] : b.to;
      const outcome = (behavior.get(to) ?? []).shift() ?? 'ok';
      const tags: Record<string, string> = {};
      for (const t of b.tags ?? []) tags[t.name] = t.value;
      if (sendDelayMs) await new Promise((r) => setTimeout(r, sendDelayMs));
      sent.push({ to, subject: b.subject, tags, idem: new Headers(init.headers).get('idempotency-key'), delivered: outcome === 'ok' });
      if (outcome === '500') return new Response(JSON.stringify({ statusCode: 500, name: 'internal_server_error', message: 'Internal server error' }), { status: 500 });
      if (outcome === '422') return new Response(JSON.stringify({ statusCode: 422, name: 'validation_error', message: 'Invalid recipient address' }), { status: 422 });
      return new Response(JSON.stringify({ id: `em_${sent.length}` }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/automation/executor')),
    ...(await import('@/lib/security/unsubscribeToken')),
    ...(await import('@/lib/encryption')),
    seq: await import('@/app/actions/email_sequences'),
    editor: await import('@/app/actions/automation_editor'),
    webhook: await import('@/app/api/webhooks/email/deliverability/route'),
  };
  db = M.createAdminClient();
  // Remove what earlier KILLED runs of this test left behind (a killed run never reaches afterAll).
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('s245'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const mkUser = async (tag: string) => {
    const password = randomUUID();
    const em = `s245-${runId}-${tag}-owner@example.com`;
    const { data } = await db.auth.admin.createUser({ email: em, password, email_confirm: true });
    userIds.push(data.user.id);
    await new Promise((r) => setTimeout(r, 800));
    const { data: m } = await db.from('workspace_members').select('workspace_id').eq('user_id', data.user.id).limit(1).maybeSingle();
    return { em, password, workspaceId: m.workspace_id as string };
  };
  const u1 = await mkUser('a'); const u2 = await mkUser('b');
  ws = u1.workspaceId; ws2 = u2.workspaceId; h.workspaceId = ws;
  await db.from('workspace_email_providers').insert({ workspace_id: ws, provider: 'resend', encrypted_api_key: M.encrypt('re_live_fake_key_0000'), from_email: `noreply@verify-${runId}.example`, from_name: 'Verify' });

  h.userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await h.userClient.auth.signInWithPassword({ email: u1.em, password: u1.password });
  if (error) throw new Error(`sign-in: ${error.message}`);
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  // Deletes the workspaces themselves (and any others this run's users own) and fails loudly if anything is left.
  await deleteTestWorkspaces(db, [ws, ws2], userIds);
});

// ───────────────────────────── S2 ─────────────────────────────
describe('S2: editing an active sequence keeps in-flight contacts on the right step', () => {
  let seqId = ''; let loaded: any;
  const payload = (emails: any[], name = 'S2 seq') => ({ id: seqId, name, trigger_type: 'appointment_booked', trigger_filter_id: null, is_active: true, emails });
  const stepIds = async () => ((await db.from('workflow_steps').select('id').eq('workflow_id', seqId)).data ?? []).map((s: any) => s.id).sort();
  const reload = async () => (loaded = (await M.seq.getSequenceForEdit(seqId)).data);

  it('creates via the real saveSequence; delays round-trip without shifting; a no-op re-save changes no step id', async () => {
    const { data: wf } = await db.from('workflows').insert({ workspace_id: ws, name: 'S2', trigger_type: 'appointment_booked', trigger_config: {}, is_active: true, source: 'email_sequence' }).select().single();
    seqId = wf.id;
    const r = await M.seq.saveSequence(payload([
      { subject: 'A', body: 'a', delayValue: 1, delayUnit: 'days' },
      { subject: 'B', body: 'b', delayValue: 1, delayUnit: 'days' },
      { subject: 'C', body: 'c', delayValue: 2, delayUnit: 'days' },
    ]));
    expect(r.success).toBe(true);
    await reload();
    expect(loaded.emails.map((e: any) => e.delayValue).slice(1)).toEqual([1, 2]);
    expect(loaded.emails.every((e: any) => e.stepId)).toBe(true);
    const before = await stepIds();
    for (let i = 0; i < 2; i++) { expect((await M.seq.saveSequence(payload(loaded.emails))).success).toBe(true); await reload(); }
    expect(loaded.emails.map((e: any) => e.delayValue).slice(1)).toEqual([1, 2]); // used to shift on every save
    expect(await stepIds()).toEqual(before); // edited in place, nothing deleted/re-inserted
  });

  let x: any; let xExec: any;
  it('content edit mid-flight: contact keeps position + timer and then receives the EDITED email', async () => {
    x = await mkContact('x');
    await M.triggerWorkflows(ws, 'appointment_booked', x.id);
    expect(subjectsTo(x.email)).toEqual(['A']);
    [xExec] = (await db.from('workflow_executions').select('*').eq('contact_id', x.id)).data;
    expect(xExec.current_step_id).toBe(loaded.emails[1].waitStepId);
    const resumeAt = xExec.context.resume_at;

    loaded.emails[1].subject = 'B-edited';
    expect((await M.seq.saveSequence(payload(loaded.emails, 'S2 renamed'))).success).toBe(true);
    const after = await exec(xExec.id);
    expect(after.status).toBe('running');
    expect(after.current_step_id).toBe(xExec.current_step_id);
    expect(after.context.resume_at).toBe(resumeAt);

    await forceDue(xExec.id); await M.processNextStep(xExec.id);
    expect(subjectsTo(x.email)).toEqual(['A', 'B-edited']);
    await reload();
    expect((await exec(xExec.id)).current_step_id).toBe(loaded.emails[2].waitStepId);
  });

  it('inserting an email BEFORE the contact\'s position: contact continues to C (not skipped, not completed)', async () => {
    await reload();
    const emails = [loaded.emails[0], loaded.emails[1], { subject: 'D', body: 'd', delayValue: 3, delayUnit: 'hours' }, loaded.emails[2]];
    expect((await M.seq.saveSequence(payload(emails))).success).toBe(true);
    const mid = await exec(xExec.id);
    expect(mid.status).toBe('running');
    await reload();
    expect(mid.current_step_id).toBe(loaded.emails[3].waitStepId); // wait-before-C, id unchanged, position moved
    await forceDue(xExec.id); await M.processNextStep(xExec.id);
    expect(subjectsTo(x.email)).toEqual(['A', 'B-edited', 'C']);
    expect((await exec(xExec.id)).status).toBe('completed');
  });

  let y: any; let yExec: any;
  it('removing the step a contact is waiting on moves them to the next surviving step (recorded, still running)', async () => {
    await reload(); // [A, B-edited, D, C]
    y = await mkContact('y');
    await M.triggerWorkflows(ws, 'appointment_booked', y.id);
    [yExec] = (await db.from('workflow_executions').select('*').eq('contact_id', y.id)).data;
    expect(yExec.current_step_id).toBe(loaded.emails[1].waitStepId); // waiting before B
    const removeB = [loaded.emails[0], loaded.emails[2], loaded.emails[3]];
    expect((await M.seq.saveSequence(payload(removeB))).success).toBe(true);
    const moved = await exec(yExec.id);
    expect(moved.status).toBe('running');
    expect(moved.current_step_id).toBe(loaded.emails[2].waitStepId); // wait-before-D
    expect(moved.context.remapped_from_step).toBe(yExec.current_step_id);
    expect(moved.context.resume_at).toBeUndefined();
    await M.processNextStep(yExec.id); // fresh wait starts
    expect((await exec(yExec.id)).context.resume_at).toBeTruthy();
    await forceDue(yExec.id); await M.processNextStep(yExec.id);
    expect(subjectsTo(y.email)).toEqual(['A', 'D']);
  });

  it('removing the LAST email while a contact is about to receive it completes them with a recorded reason', async () => {
    await reload(); // [A, D, C]
    const z = await mkContact('z');
    const zExec = await mkExec((await db.from('workflows').select('id').eq('id', seqId).single()).data.id, z.id, loaded.emails[2].stepId);
    expect((await M.seq.saveSequence(payload([loaded.emails[0], loaded.emails[1]]))).success).toBe(true);
    const done = await exec(zExec.id);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('steps_removed');
  });

  it('the save is atomic: a failure part-way rolls EVERYTHING back (name, steps, executions)', async () => {
    await reload();
    const before = await stepIds();
    const nameBefore = (await db.from('workflows').select('name').eq('id', seqId).single()).data.name;
    const w = await mkContact('w');
    const wExec = await mkExec(seqId, w.id, loaded.emails[1].stepId);
    const { error } = await h.userClient.rpc('save_workflow_graph', {
      p_workflow_id: seqId, p_workspace_id: ws,
      p_fields: { name: 'SHOULD-NOT-PERSIST', trigger_type: 'appointment_booked', is_active: true },
      p_steps: [{ id: null, position: 1, type: 'send_email', config: { subject: 'x', body: 'x' } }], // would delete every other step
      p_edges: [{ sourcePosition: 99, targetPosition: 1, handle: 'next' }], // invalid -> fails after the deletes
    });
    expect(error).toBeTruthy();
    expect((await db.from('workflows').select('name').eq('id', seqId).single()).data.name).toBe(nameBefore);
    expect(await stepIds()).toEqual(before);
    expect((await exec(wExec.id)).current_step_id).toBe(loaded.emails[1].stepId);
    expect((await exec(wExec.id)).status).toBe('running');
  });

  it('a running execution with no position is now an ERROR, not a silent "completed"', async () => {
    const q = await mkContact('q');
    const e = await mkExec(seqId, q.id, null);
    await M.processNextStep(e.id);
    const r = await exec(e.id);
    expect(r.status).toBe('failed');
    expect(r.error_message).toMatch(/lost its position/);
  });

  it('the generic /automations editor (no step ids) also edits in place by position+type', async () => {
    const { wf, ids } = await mkWorkflow('S2 generic', 'contact_created', [
      { type: 'send_email', config: { subject: 'g1', body: 'g' } }, { type: 'wait', config: { delayValue: 1, delayUnit: 'days' } }, { type: 'send_email', config: { subject: 'g2', body: 'g' } },
    ], null);
    const r = await M.editor.saveWorkflowEditor({ id: wf.id, name: 'S2 generic', trigger_type: 'contact_created', is_active: false, steps: [
      { position: 1, type: 'send_email', config: { subject: 'g1-new', body: 'g' } }, { position: 2, type: 'wait', config: { delayValue: 2, delayUnit: 'days' } }, { position: 3, type: 'send_email', config: { subject: 'g2', body: 'g' } },
    ] });
    expect(r.success).toBe(true);
    const after = ((await db.from('workflow_steps').select('id').eq('workflow_id', wf.id)).data ?? []).map((s: any) => s.id).sort();
    expect(after).toEqual([...ids].sort());
    const edges = (await db.from('workflow_edges').select('id').eq('workflow_id', wf.id)).data ?? [];
    expect(edges.length).toBe(2);
  });
});

// ───────────────────────────── S4 ─────────────────────────────
describe('S4: claim / reclaim / retry', () => {
  let foreignRunning = 0;
  it('sweep: reclaims a stale-locked run, recovers an orphan, abandons an exhausted one, ignores everything not due', async () => {
    foreignRunning = (await db.from('workflow_executions').select('id', { count: 'exact', head: true }).eq('status', 'running').neq('workspace_id', ws).neq('workspace_id', ws2)).count ?? 0;
    if (foreignRunning > 0) { console.warn(`SKIPPED sweep test: ${foreignRunning} live running executions exist (the sweep is workspace-agnostic)`); return; }
    const { wf, ids } = await mkWorkflow('S4 sweep', 'contact_created', twoEmail('S4a'));
    const c = async (t: string) => mkContact(t);
    const [stale, orphan, exhausted, future, fresh, backoff, freshLock] = await Promise.all(['st', 'or', 'ex', 'fu', 'fr', 'bo', 'fl'].map(c));
    const old = new Date(Date.now() - 10 * 60e3).toISOString();
    const eStale = await mkExec(wf.id, stale.id, ids[0], { locked_at: old, locked_by: 'dead-worker' });
    const eOrphan = await mkExec(wf.id, orphan.id, ids[0]);
    const eExhausted = await mkExec(wf.id, exhausted.id, ids[0], { locked_at: old, locked_by: 'dead-worker', reclaim_count: 3 });
    const eFuture = await mkExec(wf.id, future.id, ids[1], { context: { resume_at: new Date(Date.now() + 3600e3).toISOString() } });
    const eFresh = await mkExec(wf.id, fresh.id, ids[0], { started_at: new Date().toISOString() });
    const eBackoff = await mkExec(wf.id, backoff.id, ids[0], { next_attempt_at: new Date(Date.now() + 3600e3).toISOString() });
    const eFreshLock = await mkExec(wf.id, freshLock.id, ids[0], { locked_at: new Date(Date.now() - 60e3).toISOString(), locked_by: 'live-worker' });

    const { data: claimed } = await db.rpc('acquire_workflow_executions', { worker_id: 'live-test', batch_size: 100, target_execution_id: null });
    const got = new Set((claimed ?? []).map((r: any) => r.id));
    expect(got.has(eStale.id)).toBe(true);
    expect(got.has(eOrphan.id)).toBe(true);
    for (const e of [eExhausted, eFuture, eFresh, eBackoff, eFreshLock]) expect(got.has(e.id)).toBe(false);
    expect((claimed ?? []).find((r: any) => r.id === eStale.id).reclaim_count).toBe(1);

    expect((await exec(eExhausted.id)).status).toBe('failed');
    expect((await exec(eExhausted.id)).error_message).toMatch(/Abandoned/);

    await M.runClaimedExecution(eStale.id, 'live-test');
    await M.runClaimedExecution(eOrphan.id, 'live-test');
    expect(subjectsTo(stale.email)).toEqual(['S4a-E1']);
    expect(subjectsTo(orphan.email)).toEqual(['S4a-E1']);
    expect((await exec(eStale.id)).locked_by).toBeNull(); // released
    expect(subjectsTo(exhausted.email)).toEqual([]);
    expect(subjectsTo(fresh.email)).toEqual([]);
    expect((await exec(eFreshLock.id)).locked_by).toBe('live-worker');
  });

  it('overlapping triggers cannot double-send a step (claim), and a crash-redelivery reuses the idempotency key', async () => {
    const { wf, ids } = await mkWorkflow('S4 race', 'contact_created', twoEmail('S4d'));
    const c = await mkContact('race');
    const e = await mkExec(wf.id, c.id, ids[0]);
    sendDelayMs = 400; // make the callers genuinely overlap while the first is mid-send
    await Promise.all([M.processNextStep(e.id), M.processNextStep(e.id), M.processNextStep(e.id), M.processNextStep(e.id)]);
    sendDelayMs = 0;
    expect(subjectsTo(c.email)).toEqual(['S4d-E1']); // exactly one, not four
    expect((await exec(e.id)).locked_by).toBeNull();

    // crash-window: email went out but progress was never recorded -> the step re-runs
    await db.from('workflow_executions').update({ current_step_id: ids[0], context: {}, status: 'running' }).eq('id', e.id);
    await M.processNextStep(e.id);
    const mine = sent.filter((s) => s.to === c.email);
    expect(mine.length).toBe(2);
    expect(mine[0].idem).toBeTruthy();
    expect(mine[1].idem).toBe(mine[0].idem); // Resend would deduplicate this second one
  });

  it('transient failure: retried after a backoff (not failed); a genuine retry uses a NEW idempotency key', async () => {
    const { wf, ids } = await mkWorkflow('S4 transient', 'contact_created', twoEmail('S4t'));
    const t = await mkContact('trans');
    behavior.set(t.email, ['500', 'ok']);
    const e = await mkExec(wf.id, t.id, ids[0]);
    await M.processNextStep(e.id);
    const r1 = await exec(e.id);
    expect(r1.status).toBe('running');
    expect(r1.error_message).toMatch(/will retry/);
    const mins = (new Date(r1.next_attempt_at).getTime() - Date.now()) / 60e3;
    expect(mins).toBeGreaterThan(13); expect(mins).toBeLessThan(16);
    await M.processNextStep(e.id); // not due yet -> nothing
    expect(sent.filter((s) => s.to === t.email).length).toBe(1);
    await db.from('workflow_executions').update({ next_attempt_at: new Date(Date.now() - 1000).toISOString() }).eq('id', e.id);
    await M.processNextStep(e.id);
    const attempts = sent.filter((s) => s.to === t.email);
    expect(attempts.map((a) => a.delivered)).toEqual([false, true]);
    expect(attempts[1].idem).not.toBe(attempts[0].idem);
    expect((await exec(e.id)).current_step_id).toBe(ids[1]);
    expect((await exec(e.id)).status).toBe('running');
  });

  it('a permanently bad address skips THAT email only; the rest of the sequence still goes out', async () => {
    const { wf, ids } = await mkWorkflow('S4 perm', 'contact_created', twoEmail('S4p'));
    const p = await mkContact('perm');
    behavior.set(p.email, ['422']); // first email rejected; later ones accepted
    const e = await mkExec(wf.id, p.id, ids[0]);
    await M.processNextStep(e.id);
    let r = await exec(e.id);
    expect(r.status).toBe('running'); // NOT failed
    expect(r.current_step_id).toBe(ids[1]);
    expect(r.context.failed_steps.length).toBe(1);
    await forceDue(e.id); await M.processNextStep(e.id);
    expect(subjectsTo(p.email)).toEqual(['S4p-E2']);
    r = await exec(e.id);
    expect(r.status).toBe('completed');
    expect(r.error_message).toMatch(/could not be sent and were skipped/);
    const list = await M.seq.listSequences();
    expect(list.success).toBe(true);
  });

  it('retry exhaustion: gives up on that email after 3 attempts and continues', async () => {
    const { wf, ids } = await mkWorkflow('S4 exhaust', 'contact_created', twoEmail('S4x'));
    const u = await mkContact('exh');
    behavior.set(u.email, ['500', '500', '500']);
    const e = await mkExec(wf.id, u.id, ids[0]);
    for (let i = 0; i < 3; i++) { await db.from('workflow_executions').update({ next_attempt_at: null }).eq('id', e.id); await M.processNextStep(e.id); }
    expect(sent.filter((s) => s.to === u.email).length).toBe(3);
    const r = await exec(e.id);
    expect(r.status).toBe('running');
    expect(r.current_step_id).toBe(ids[1]);
    expect(r.context.failed_steps[0].attempts).toBe(3);
    await forceDue(e.id); await M.processNextStep(e.id);
    expect(subjectsTo(u.email)).toEqual(['S4x-E2']);
  });

  it('generic (non-sequence) workflows keep fail-stop on a permanent email failure', async () => {
    const { wf, ids } = await mkWorkflow('S4 generic', 'contact_created', twoEmail('S4g'), null);
    const g = await mkContact('gen');
    behavior.set(g.email, ['422']);
    const e = await mkExec(wf.id, g.id, ids[0]);
    await M.processNextStep(e.id);
    expect((await exec(e.id)).status).toBe('failed');
  });
});

// ───────────────────────────── S5 ─────────────────────────────
describe('S5: bounces / complaints / opens on sequence sends', () => {
  let wfId = '';
  const post = async (event: any, opts: { badSig?: boolean } = {}) => {
    const { Webhook } = await import('svix');
    const body = JSON.stringify(event);
    const id = `msg_${randomUUID()}`; const ts = new Date();
    const sig = opts.badSig ? 'v1,AAAA' : new Webhook(SECRET).sign(id, ts, body);
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/api/webhooks/email/deliverability', {
      method: 'POST', body, headers: { 'svix-id': id, 'svix-timestamp': String(Math.floor(ts.getTime() / 1000)), 'svix-signature': sig, 'content-type': 'application/json' },
    });
    return M.webhook.POST(req);
  };
  const evt = (type: string, to: string, tags: any, extra: any = {}) => ({ type, created_at: new Date().toISOString(), data: { email_id: randomUUID(), from: 'x@y.z', to: [to], subject: 's', tags, ...extra } });
  const enroll = async (tag: string) => {
    const c = await mkContact(tag);
    await M.triggerWorkflows(ws, 'contact_created', c.id);
    const s = sent.filter((x) => x.to === c.email)[0];
    return { c, tags: s.tags, execId: (await db.from('workflow_executions').select('id').eq('contact_id', c.id).single()).data.id };
  };
  const invalid = async (id: string) => (await db.from('contacts').select('is_invalid_email, consecutive_soft_bounces').eq('id', id).single()).data;

  it('sequence sends carry workflow_id + contact_id tags', async () => {
    const r = await mkWorkflow('S5 seq', 'contact_created', twoEmail('S5'), 'email_sequence', true);
    wfId = r.wf.id;
    const { c, tags } = await enroll('tagcheck');
    expect(tags.workflow_id).toBe(wfId);
    expect(tags.contact_id).toBe(c.id);
  });

  it('a signed HARD bounce (Resend payload shape) flags the contact; the sequence then refuses to email them', async () => {
    const { c, tags, execId } = await enroll('hard');
    expect((await invalid(c.id)).is_invalid_email).toBeFalsy();
    const res = await post(evt('email.bounced', c.email, tags, { bounce: { type: 'Permanent', subType: 'General', message: 'mailbox does not exist' } }));
    expect(res.status).toBe(200);
    expect((await invalid(c.id)).is_invalid_email).toBe(true);
    const before = sent.length;
    await forceDue(execId); await M.processNextStep(execId);
    expect(sent.length).toBe(before); // no further email to a bounced address
    expect((await exec(execId)).status).toBe('cancelled');
  });

  it('a COMPLAINT flags the contact immediately', async () => {
    const { c, tags } = await enroll('complaint');
    expect((await post(evt('email.complained', c.email, tags))).status).toBe(200);
    expect((await invalid(c.id)).is_invalid_email).toBe(true);
  });

  it('soft (Transient) bounces count and flag at 3 in a row, like campaigns', async () => {
    const { c, tags } = await enroll('soft');
    for (let i = 1; i <= 3; i++) {
      await post(evt('email.bounced', c.email, tags, { bounce: { type: 'Transient', subType: 'MailboxFull', message: 'full' } }));
      const s = await invalid(c.id);
      expect(s.consecutive_soft_bounces).toBe(i);
      expect(!!s.is_invalid_email).toBe(i === 3);
    }
  });

  it('opens are recorded against the workflow (no campaign row needed)', async () => {
    const { c, tags } = await enroll('open');
    expect((await post(evt('email.opened', c.email, tags))).status).toBe(200);
    const { data } = await db.from('email_tracking_logs').select('workflow_id, campaign_id, event_type, contact_id').eq('contact_id', c.id);
    expect(data).toEqual([{ workflow_id: wfId, campaign_id: null, event_type: 'open', contact_id: c.id }]);
  });

  it('is workspace-scoped: the same address in ANOTHER workspace is untouched', async () => {
    const { c, tags } = await enroll('scope');
    const other = await db.from('contacts').insert({ workspace_id: ws2, email: c.email, first_name: 'O', last_name: 'V' }).select().single();
    await post(evt('email.complained', c.email, tags));
    expect((await invalid(c.id)).is_invalid_email).toBe(true);
    expect((await invalid(other.data.id)).is_invalid_email).toBeFalsy();
  });

  it('rejects a bad signature, and a workflow_id that is not ours is dead-lettered without touching contacts', async () => {
    const c = await mkContact('neg');
    expect((await post(evt('email.complained', c.email, { workflow_id: wfId }), { badSig: true })).status).toBe(401);
    expect((await post(evt('email.complained', c.email, { workflow_id: randomUUID() }))).status).toBe(200);
    expect((await invalid(c.id)).is_invalid_email).toBeFalsy();
  });
});
