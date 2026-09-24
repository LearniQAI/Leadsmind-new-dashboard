// Live verification: exit-on-conversion for email sequences. Real actions (saveSequence /
// getSequenceForEdit under a real RLS user), real executor, real database, throwaway workspace.
// Only the outbound Resend HTTP call is intercepted (recorded, never delivered).
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { deleteTestWorkspaces, sweepStaleTestWorkspaces, testRunPatterns } from './liveCleanup';
import { randomUUID } from 'crypto';
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

const sent: { to: string; subject: string }[] = [];
const realFetch = globalThis.fetch;

let db: any, ws = '', ownerId = '';
const userIds: string[] = [];
const runId = randomUUID().slice(0, 8);
const email = (t: string) => `goal-${runId}-${t}@example.com`;
let M: any;

const mkContact = async (tag: string, extra: any = {}) =>
  (await db.from('contacts').insert({ workspace_id: ws, email: email(tag), first_name: `G${tag}`, last_name: 'V', ...extra }).select().single()).data;
const subjectsTo = (to: string) => sent.filter((s) => s.to === to).map((s) => s.subject);
const exec = async (contactId: string, workflowId: string) => (await db.from('workflow_executions').select('*').eq('contact_id', contactId).eq('workflow_id', workflowId).single()).data;
const forceDueAndRun = async (id: string) => {
  await db.from('workflow_executions').update({ context: { resume_at: new Date(Date.now() - 60e3).toISOString() }, next_attempt_at: null }).eq('id', id);
  await M.processNextStep(id);
};
let apptSeq = 0;
const bookAppointment = async (contactId: string, status: string) => {
  apptSeq++;
  const start = new Date(Date.now() + apptSeq * 3 * 86400e3).toISOString();
  const { data, error } = await db.from('appointments').insert({
    workspace_id: ws, calendar_id: null, contact_id: contactId, user_id: ownerId, title: `goal test ${apptSeq}`,
    start_time: start, end_time: new Date(new Date(start).getTime() + 18e5).toISOString(), status,
    meeting_mode: 'google_meet', metadata: {},
  }).select().single();
  if (error) throw new Error(`appointment: ${error.message}`);
  return data;
};

async function mkSequence(name: string, goals: any[] | undefined, trigger = 'contact_created') {
  const { data: wf } = await db.from('workflows').insert({ workspace_id: ws, name, trigger_type: trigger, trigger_config: {}, is_active: true, source: 'email_sequence' }).select().single();
  const emails = ['1', '2', '3'].map((n) => ({ subject: `${name}-${n}`, body: `body ${n}`, delayValue: 1, delayUnit: 'days' as const }));
  const r = await M.seq.saveSequence({ id: wf.id, name, trigger_type: trigger, trigger_filter_id: null, is_active: true, emails, ...(goals !== undefined ? { goals } : {}) });
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
  };
  db = M.createAdminClient();
  // Remove what earlier KILLED runs of this test left behind (a killed run never reaches afterAll).
  const swept = await sweepStaleTestWorkspaces(db, testRunPatterns('goal'));
  if (swept) console.warn(`[cleanup] removed ${swept} stale workspace(s) left by earlier runs of this test`);

  const password = randomUUID();
  const em = `goal-${runId}-owner@example.com`;
  const { data, error: ue } = await db.auth.admin.createUser({ email: em, password, email_confirm: true });
  if (ue) throw new Error(`createUser: ${ue.message}`);
  ownerId = data.user.id; userIds.push(ownerId);
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

describe('appointment goal', () => {
  let seqId = '';

  it('the editor round-trip: goals are saved to goal_rules and read back', async () => {
    seqId = await mkSequence('GA', [{ kind: 'appointment' }]);
    const { data: wf } = await db.from('workflows').select('goal_rules').eq('id', seqId).single();
    expect(wf.goal_rules).toEqual([{ field: 'meeting_booked', operator: 'equals', value: true }]);
    const loaded = await M.seq.getSequenceForEdit(seqId);
    expect(loaded.data.goals).toEqual([{ kind: 'appointment' }]);
    // saving without `goals` leaves them alone; an explicit [] clears them
    await M.seq.saveSequence({ id: seqId, name: 'GA', trigger_type: 'contact_created', trigger_filter_id: null, is_active: true, emails: loaded.data.emails });
    expect((await db.from('workflows').select('goal_rules').eq('id', seqId).single()).data.goal_rules.length).toBe(1);
    await M.seq.saveSequence({ id: seqId, name: 'GA', trigger_type: 'contact_created', trigger_filter_id: null, is_active: true, emails: loaded.data.emails, goals: [] });
    expect((await db.from('workflows').select('goal_rules').eq('id', seqId).single()).data.goal_rules).toEqual([]);
    await M.seq.saveSequence({ id: seqId, name: 'GA', trigger_type: 'contact_created', trigger_filter_id: null, is_active: true, emails: loaded.data.emails, goals: [{ kind: 'appointment' }] });
    expect((await db.from('workflows').select('goal_rules').eq('id', seqId).single()).data.goal_rules.length).toBe(1);
  });

  it('a contact who books mid-sequence stops receiving emails; the run completes with a recorded reason (a CANCELLED booking does not count)', async () => {
    const x = await mkContact('x');
    await M.triggerWorkflows(ws, 'contact_created', x.id);
    expect(subjectsTo(x.email)).toEqual(['GA-1']);
    const e = await exec(x.id, seqId);

    const cancelled = await bookAppointment(x.id, 'cancelled');
    await forceDueAndRun(e.id);
    expect(subjectsTo(x.email)).toEqual(['GA-1', 'GA-2']); // cancelled booking is NOT a conversion
    expect((await exec(x.id, seqId)).status).toBe('running');

    await bookAppointment(x.id, 'scheduled'); // the real booking, mid-sequence
    await forceDueAndRun(e.id);
    expect(subjectsTo(x.email)).toEqual(['GA-1', 'GA-2']); // GA-3 never sent
    const done = await exec(x.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('goal_achieved');
    expect(done.context.goal_met.field).toBe('meeting_booked');
    const { data: logs } = await db.from('workflow_step_logs').select('status, error_message').eq('execution_id', e.id).eq('status', 'skipped');
    expect(logs.length).toBe(1);
    expect(logs[0].error_message).toMatch(/Ended early: contact converted \(an appointment was booked\)/);
    expect(cancelled.status).toBe('cancelled');
  });

  it('a contact who does NOT convert receives every email and completes normally', async () => {
    const y = await mkContact('y');
    await M.triggerWorkflows(ws, 'contact_created', y.id);
    const e = await exec(y.id, seqId);
    await forceDueAndRun(e.id); await forceDueAndRun(e.id);
    expect(subjectsTo(y.email)).toEqual(['GA-1', 'GA-2', 'GA-3']);
    const done = await exec(y.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBeUndefined();
  });

  it('a contact who had ALREADY booked when enrolled gets no email at all', async () => {
    const z = await mkContact('z');
    await bookAppointment(z.id, 'showed_up');
    await M.triggerWorkflows(ws, 'contact_created', z.id);
    expect(subjectsTo(z.email)).toEqual([]);
    const done = await exec(z.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('goal_achieved');
  });

  it('a goal a different contact met does not affect this contact (no cross-contact leak)', async () => {
    const other = await mkContact('other');
    const stranger = await mkContact('stranger');
    await bookAppointment(stranger.id, 'scheduled');
    await M.triggerWorkflows(ws, 'contact_created', other.id);
    expect(subjectsTo(other.email)).toEqual(['GA-1']);
    await db.from('workflows').update({ is_active: false }).eq('id', seqId); // free the trigger for the next section
  });
});

describe('tag goal reads tag_assignments (Segments before/after pattern)', () => {
  let seqId = ''; let tagId = ''; let tagName = '';

  it('BEFORE: a contact with the tag only in the legacy contacts.tags array does NOT trigger the goal', async () => {
    tagName = `GoalTag-${runId}`;
    tagId = (await db.from('tags').insert({ workspace_id: ws, name: tagName }).select().single()).data.id;
    seqId = await mkSequence('GT', [{ kind: 'tag', tagId }]);
    expect((await db.from('workflows').select('goal_rules').eq('id', seqId).single()).data.goal_rules)
      .toEqual([{ field: 'tag', operator: 'equals', value: tagName, tag_id: tagId }]);

    const legacy = await mkContact('legacy', { tags: [tagName] });
    const assignments = (await db.from('tag_assignments').select('id').eq('entity_id', legacy.id)).data ?? [];
    expect(assignments.length).toBe(0); // premise: legacy array only, no relational row
    await M.triggerWorkflows(ws, 'contact_created', legacy.id);
    const e = await exec(legacy.id, seqId);
    await forceDueAndRun(e.id);
    expect(subjectsTo(legacy.email)).toEqual(['GT-1', 'GT-2']); // still emailing: goal NOT met
    expect((await exec(legacy.id, seqId)).status).toBe('running');
  });

  it('AFTER: a tag_assignments row (and an empty legacy array) DOES end the sequence', async () => {
    const real = await mkContact('real', { tags: [] });
    await M.triggerWorkflows(ws, 'contact_created', real.id);
    const e = await exec(real.id, seqId);
    expect(subjectsTo(real.email)).toEqual(['GT-1']);
    await db.from('tag_assignments').insert({ workspace_id: ws, tag_id: tagId, entity_type: 'contact', entity_id: real.id });
    await db.from('contacts').update({ tags: [] }).eq('id', real.id); // legacy array stays empty regardless of any sync
    await forceDueAndRun(e.id);
    expect(subjectsTo(real.email)).toEqual(['GT-1']); // GT-2 never sent
    const done = await exec(real.id, seqId);
    expect(done.status).toBe('completed');
    expect(done.context.termination_reason).toBe('goal_achieved');
    expect(done.context.goal_met.tag_id).toBe(tagId);
  });

  it('a tag goal keeps working after the tag is renamed (matched by id)', async () => {
    await db.from('tags').update({ name: `${tagName}-renamed` }).eq('id', tagId);
    const c = await mkContact('renamed');
    await db.from('tag_assignments').insert({ workspace_id: ws, tag_id: tagId, entity_type: 'contact', entity_id: c.id });
    expect(await M.evaluateGoal([{ field: 'tag', operator: 'equals', value: tagName, tag_id: tagId }], ws, c.id, db)).toBe(true);
  });

  it('server validation: a tag from another workspace / an unknown goal kind is rejected', async () => {
    const bad = await M.seq.saveSequence({ id: seqId, name: 'GT', trigger_type: 'contact_created', trigger_filter_id: null, is_active: true,
      emails: [{ subject: 's', body: 'b', delayValue: 1, delayUnit: 'days' }], goals: [{ kind: 'tag', tagId: randomUUID() }] });
    expect(bad.success).toBe(false);
    const bad2 = await M.seq.saveSequence({ id: seqId, name: 'GT', trigger_type: 'contact_created', trigger_filter_id: null, is_active: true,
      emails: [{ subject: 's', body: 'b', delayValue: 1, delayUnit: 'days' }], goals: [{ kind: 'nonsense' }] });
    expect(bad2.success).toBe(false);
  });
});
