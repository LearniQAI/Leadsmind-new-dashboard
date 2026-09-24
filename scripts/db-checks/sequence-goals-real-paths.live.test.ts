// Live verification, REAL PATHS: exit-on-conversion detects an invoice created + paid through the
// real finance actions, and appointments booked through BOTH real booking flows (the public
// bookAppointment a lead uses, and the dashboard's createAppointment) -- no direct row inserts for
// the conversion itself. Throwaway workspace; only the outbound Resend HTTP call is intercepted.
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const h = vi.hoisted(() => ({ workspaceId: '', userId: '', userClient: null as any }));
vi.mock('@/lib/auth', async (orig) => {
  const actual = await orig<any>();
  return {
    ...actual,
    getCurrentWorkspaceId: async () => h.workspaceId,
    requireWorkspaceAccess: async () => ({ workspaceId: h.workspaceId, userId: h.userId, role: 'owner' }),
    requireAuth: async () => ({}),
  };
});
vi.mock('@/lib/supabase/server', async (orig) => {
  const actual = await orig<any>();
  return { ...actual, createServerClient: async () => h.userClient };
});
vi.mock('next/cache', () => ({ revalidatePath: () => {}, revalidateTag: () => {} }));
vi.mock('next/navigation', () => ({ redirect: () => {} }));

const sent: { to: string; subject: string }[] = [];
const realFetch = globalThis.fetch;

let db: any, ws = '', ownerId = '';
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);
const email = (t: string) => `real-${runId}-${t}@example.com`;
let M: any;

const mkContact = async (tag: string) =>
  (await db.from('contacts').insert({ workspace_id: ws, email: email(tag), first_name: `R${tag}`, last_name: 'V' }).select().single()).data;
// Only the sequence's own emails (the real paths also send confirmations/receipts through the same stub).
const seqSubjects = (to: string, prefix: string) => sent.filter((s) => s.to === to && s.subject.startsWith(prefix)).map((s) => s.subject);
const exec = async (contactId: string, workflowId: string) => (await db.from('workflow_executions').select('*').eq('contact_id', contactId).eq('workflow_id', workflowId).single()).data;
const forceDueAndRun = async (id: string) => {
  await db.from('workflow_executions').update({ context: { resume_at: new Date(Date.now() - 60e3).toISOString() }, next_attempt_at: null }).eq('id', id);
  await M.processNextStep(id);
};

async function mkSequence(name: string, goals: any[]) {
  const { data: wf } = await db.from('workflows').insert({ workspace_id: ws, name, trigger_type: 'contact_created', trigger_config: {}, is_active: true, source: 'email_sequence' }).select().single();
  const emails = ['1', '2', '3'].map((n) => ({ subject: `${name}-${n}`, body: `body ${n}`, delayValue: 1, delayUnit: 'days' as const }));
  const r = await M.seq.saveSequence({ id: wf.id, name, trigger_type: 'contact_created', trigger_filter_id: null, is_active: true, emails, goals });
  if (!r.success) throw new Error(`saveSequence: ${r.error}`);
  return wf.id as string;
}

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  globalThis.fetch = (async (url: any, init?: any) => {
    if (String(url).includes('api.resend.com/emails')) {
      const b = JSON.parse(init.body);
      sent.push({ to: Array.isArray(b.to) ? b.to[0] : b.to, subject: b.subject });
      return new Response(JSON.stringify({ id: `em_${sent.length}` }), { status: 200 });
    }
    return realFetch(url, init);
  }) as typeof fetch;

  M = {
    ...(await import('@/lib/supabase/server')),
    ...(await import('@/lib/automation/executor')),
    ...(await import('@/lib/automation/goals')),
    ...(await import('@/lib/encryption')),
    seq: await import('@/app/actions/email_sequences'),
    finance: await import('@/app/actions/finance'),
    pub: await import('@/app/actions/calendar/public'),
    appts: await import('@/app/actions/calendar/appointments'),
  };
  db = M.createAdminClient();
  // Remove what earlier KILLED runs of this test left behind (a killed run never reaches afterAll).
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('real'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const password = randomUUID();
  const em = `real-${runId}-owner@example.com`;
  const { data, error: ue } = await db.auth.admin.createUser({ email: em, password, email_confirm: true });
  if (ue) throw new Error(`createUser: ${ue.message}`);
  ownerId = data.user.id; userIds.push(ownerId); h.userId = ownerId;
  await new Promise((r) => setTimeout(r, 800));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', ownerId).limit(1).maybeSingle()).data.workspace_id;
  h.workspaceId = ws;
  await db.from('workspace_email_providers').insert({ workspace_id: ws, provider: 'resend', encrypted_api_key: M.encrypt('re_live_fake_key_0000'), from_email: `noreply@verify-${runId}.example`, from_name: 'Verify' });
  h.userClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { error } = await h.userClient.auth.signInWithPassword({ email: em, password });
  if (error) throw new Error(`sign-in: ${error.message}`);
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  // Deletes the workspace itself (and any other this run's users own) and fails loudly if anything is left.
  await deleteTestWorkspaces(db, [ws], userIds);
});

describe('invoice goal via the real finance actions', () => {
  let seqId = '';

  it('an invoice created (unpaid) does not end the sequence; marking it paid through the real action does', async () => {
    seqId = await mkSequence('INV', [{ kind: 'invoice' }]);
    const c = await mkContact('inv');
    await M.triggerWorkflows(ws, 'contact_created', c.id);
    expect(seqSubjects(c.email, 'INV-')).toEqual(['INV-1']);
    const e = await exec(c.id, seqId);

    // Real invoice creation (draft) — must NOT count as a conversion.
    const created = await M.finance.saveInvoice({
      contact_id: c.id, items: [{ description: 'Consulting', quantity: 1, unit_price: 100 }],
      subtotal: 100, total_amount: 100, amount_due: 100, currency: 'ZAR',
    }, { skipAutoNotify: true });
    expect(created.success).toBe(true);
    const invoiceId = created.data.id;
    await forceDueAndRun(e.id);
    expect(seqSubjects(c.email, 'INV-')).toEqual(['INV-1', 'INV-2']); // unpaid: keeps emailing
    expect((await exec(c.id, seqId)).status).toBe('running');

    // Real payment path (admin marks it paid) — writes status 'paid' + fires the paid side effects.
    const paid = await M.finance.markInvoicePaidManually(invoiceId, 'live goal test');
    expect(paid.success).toBe(true);
    const row = (await db.from('invoices').select('status, paid_at, workspace_id, contact_id').eq('id', invoiceId).single()).data;
    expect(row.status).toBe('paid');
    expect(row.workspace_id).toBe(ws);

    await forceDueAndRun(e.id);
    expect(seqSubjects(c.email, 'INV-')).toEqual(['INV-1', 'INV-2']); // INV-3 never sent
    const done = await exec(c.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('goal_achieved');
    expect(done.context.goal_met.field).toBe('invoice_paid');
    const { data: logs } = await db.from('workflow_step_logs').select('error_message').eq('execution_id', e.id).eq('status', 'skipped');
    expect(logs.map((l: any) => l.error_message)).toEqual(['Ended early: contact converted (an invoice was paid).']);
  });

  it('a contact whose invoice is never paid receives every email', async () => {
    const c = await mkContact('inv-nopay');
    await M.triggerWorkflows(ws, 'contact_created', c.id);
    await M.finance.saveInvoice({ contact_id: c.id, items: [{ description: 'x', quantity: 1, unit_price: 5 }], subtotal: 5, total_amount: 5, amount_due: 5, currency: 'ZAR' }, { skipAutoNotify: true });
    const e = await exec(c.id, seqId);
    await forceDueAndRun(e.id); await forceDueAndRun(e.id);
    expect(seqSubjects(c.email, 'INV-')).toEqual(['INV-1', 'INV-2', 'INV-3']);
    const done = await exec(c.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBeUndefined();
    await db.from('workflows').update({ is_active: false }).eq('id', seqId); // free the trigger
  });
});

describe('appointment goal via the REAL booking flows (no direct inserts)', () => {
  let seqId = ''; let calId = ''; let slots: { start: string; end?: string }[] = [];

  it('setup: a real bookable calendar with real public slots', async () => {
    calId = (await db.from('booking_calendars').insert({ workspace_id: ws, name: 'Goal test calendar', slug: `goal-${runId}` }).select().single()).data.id;
    for (let d = 2; d <= 12 && slots.length < 3; d++) {
      const date = new Date(Date.now() + d * 86400e3).toISOString().split('T')[0];
      slots = await M.pub.fetchPublicSlots(calId, date);
    }
    expect(slots.length).toBeGreaterThanOrEqual(2);
    seqId = await mkSequence('BK', [{ kind: 'appointment' }]);
  });

  it('PUBLIC flow (bookAppointment, what a real lead uses): booking mid-sequence ends the run', async () => {
    const c = await mkContact('pub');
    await M.triggerWorkflows(ws, 'contact_created', c.id);
    const e = await exec(c.id, seqId);
    expect(seqSubjects(c.email, 'BK-')).toEqual(['BK-1']);

    const res = await M.pub.bookAppointment(calId, slots[0].start, { firstName: 'Pub', lastName: 'Lead', email: c.email, popiaConsent: true });
    expect(res.success).toBe(true);
    const apt = (await db.from('appointments').select('status, contact_id, workspace_id, calendar_id').eq('id', res.appointmentId).single()).data;
    expect(apt).toEqual({ status: 'scheduled', contact_id: c.id, workspace_id: ws, calendar_id: calId }); // real row, same contact

    await forceDueAndRun(e.id);
    expect(seqSubjects(c.email, 'BK-')).toEqual(['BK-1']); // BK-2 never sent
    const done = await exec(c.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('goal_achieved');
    expect(done.context.goal_met.field).toBe('meeting_booked');
  });

  it('DASHBOARD flow (createAppointment): booking mid-sequence ends the run', async () => {
    const c = await mkContact('dash');
    await M.triggerWorkflows(ws, 'contact_created', c.id);
    const e = await exec(c.id, seqId);
    expect(seqSubjects(c.email, 'BK-')).toEqual(['BK-1']);

    const start = slots[1].start;
    const end = new Date(new Date(start).getTime() + 30 * 60e3).toISOString();
    const res = await M.appts.createAppointment({ calendarId: calId, contactId: c.id, title: 'Dashboard booking', startTime: start, endTime: end });
    expect(res.success, JSON.stringify(res)).toBe(true); // executeAction wraps the row as { success, data }
    const aptId = res.data.id;
    expect((await db.from('appointments').select('status, contact_id').eq('id', aptId).single()).data).toEqual({ status: 'scheduled', contact_id: c.id });

    await forceDueAndRun(e.id);
    expect(seqSubjects(c.email, 'BK-')).toEqual(['BK-1']);
    const done = await exec(c.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('goal_achieved');
  });

  it('a contact who does NOT book continues receiving every email', async () => {
    const c = await mkContact('nobook');
    await M.triggerWorkflows(ws, 'contact_created', c.id);
    const e = await exec(c.id, seqId);
    await forceDueAndRun(e.id); await forceDueAndRun(e.id);
    expect(seqSubjects(c.email, 'BK-')).toEqual(['BK-1', 'BK-2', 'BK-3']);
    expect((await exec(c.id, seqId)).context.termination_reason).toBeUndefined();
  });
});
