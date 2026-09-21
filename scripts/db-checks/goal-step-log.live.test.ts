// Live check of the DATABASE contract behind checkActiveWorkflowGoals' audit row.
// (The function itself can't run end-to-end live: it filters on workflows.goal_event_type, a column
// that does not exist -- see the last test. Its logic is covered by goalStepLog.test.ts.)
import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local', override: false });
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomUUID } from 'crypto';

let db: any, ws = '', userId = '';
const runId = randomUUID().slice(0, 8);
const now = () => new Date().toISOString();

beforeAll(async () => {
  const React = (await import('react')).default as any;
  if (typeof React.cache !== 'function') React.cache = (fn: any) => fn;
  db = (await import('@/lib/supabase/server')).createAdminClient();
  const { data, error } = await db.auth.admin.createUser({ email: `goal-${runId}@example.com`, password: randomUUID(), email_confirm: true });
  if (error) throw new Error(`createUser: ${error.message}`);
  userId = data.user.id;
  await new Promise((r) => setTimeout(r, 800));
  ws = (await db.from('workspace_members').select('workspace_id').eq('user_id', userId).limit(1).maybeSingle()).data.workspace_id;
});

afterAll(async () => {
  for (const t of ['workflow_step_logs', 'workflow_executions', 'workflow_edges', 'workflow_steps', 'workflows', 'contacts']) await db.from(t).delete().eq('workspace_id', ws);
  await db.auth.admin.deleteUser(userId).catch(() => {});
});

describe('workflow_step_logs contract used by the goal-termination audit row', () => {
  let exec: any, stepId = '';

  it('setup', async () => {
    const { data: wf, error: we } = await db.from('workflows').insert({ workspace_id: ws, name: 'goal wf', trigger_type: 'contact_created', trigger_config: {}, is_active: false }).select().single();
    if (we) throw new Error(we.message);
    const { data: s } = await db.from('workflow_steps').insert({ workflow_id: wf.id, workspace_id: ws, position: 1, type: 'wait', config: {} }).select('id').single();
    const { data: c } = await db.from('contacts').insert({ workspace_id: ws, email: `goal-c-${runId}@example.com`, first_name: 'G', last_name: 'V' }).select().single();
    const { data: e } = await db.from('workflow_executions').insert({ workspace_id: ws, workflow_id: wf.id, contact_id: c.id, status: 'running', current_step_id: s.id }).select().single();
    exec = e; stepId = s.id;
    expect(exec.id).toBeTruthy();
  });

  it('the OLD insert shape (no step_id) is rejected by the live database', async () => {
    const { error } = await db.from('workflow_step_logs').insert({ execution_id: exec.id, workspace_id: ws, status: 'skipped', error_message: 'old', started_at: now(), completed_at: now() });
    expect(error?.message).toMatch(/step_id/);
  });

  it('the NEW insert shape (step_id populated) lands as a real row', async () => {
    const msg = "Workflow terminated: Goal 'invoice_paid' met.";
    const { error } = await db.from('workflow_step_logs').insert({ execution_id: exec.id, workspace_id: ws, step_id: stepId, status: 'skipped', error_message: msg, started_at: now(), completed_at: now() });
    expect(error).toBeNull();
    const { data } = await db.from('workflow_step_logs').select('step_id, status, error_message').eq('execution_id', exec.id);
    expect(data).toEqual([{ step_id: stepId, status: 'skipped', error_message: msg }]);
  });

  it('FINDING: the goal query filters on workflows.goal_event_type, which does not exist', async () => {
    const { error } = await db.from('workflow_executions').select('id, workflow:workflows!inner(id)').eq('workflow.goal_event_type', 'invoice_paid');
    console.warn('goal_event_type query error:', error?.message);
    expect(error).toBeTruthy();
  });
});
