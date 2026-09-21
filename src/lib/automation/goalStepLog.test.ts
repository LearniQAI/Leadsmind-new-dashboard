import { describe, it, expect, vi, beforeEach } from 'vitest';

const inserts: { table: string; row: any }[] = [];
let executions: any[] = [];
let firstStep: { id: string } | null = null;
let insertError: any = null;
const warn = vi.fn();
const logErr = vi.fn();

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), warn: (...a: any[]) => warn(...a), info: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/automation/actions_registry', () => ({ AutomationActions: {} }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from(table: string) {
      const q: any = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        update: () => q,
        insert: (row: any) => { inserts.push({ table, row }); return Promise.resolve({ error: insertError }); },
        maybeSingle: () => Promise.resolve({ data: table === 'workflow_steps' ? firstStep : null, error: null }),
        then: (r: any) => r({ data: table === 'workflow_executions' ? executions : null, error: null }),
      };
      return q;
    },
  }),
}));

import { checkActiveWorkflowGoals } from '@/lib/automation/executor';

const logRows = () => inserts.filter((i) => i.table === 'workflow_step_logs').map((i) => i.row);

beforeEach(() => { inserts.length = 0; executions = []; firstStep = null; insertError = null; warn.mockClear(); logErr.mockClear(); });

describe('checkActiveWorkflowGoals audit row (workflow_step_logs.step_id is NOT NULL)', () => {
  it('logs against the step the run was on', async () => {
    executions = [{ id: 'e1', workflow_id: 'wf', current_step_id: 's-current', context: {} }];
    await checkActiveWorkflowGoals('w1', 'c1', 'invoice_paid');
    expect(logRows()).toEqual([expect.objectContaining({ execution_id: 'e1', workspace_id: 'w1', step_id: 's-current', status: 'skipped' })]);
  });

  it("falls back to the workflow's first step when the run has no position", async () => {
    executions = [{ id: 'e1', workflow_id: 'wf', current_step_id: null, context: {} }];
    firstStep = { id: 's-first' };
    await checkActiveWorkflowGoals('w1', 'c1', 'invoice_paid');
    expect(logRows()[0].step_id).toBe('s-first');
  });

  it('never attempts an insert it knows will be rejected, and says so', async () => {
    executions = [{ id: 'e1', workflow_id: 'wf', current_step_id: null, context: {} }];
    await checkActiveWorkflowGoals('w1', 'c1', 'invoice_paid');
    expect(logRows()).toEqual([]);
    expect(warn).toHaveBeenCalled();
  });

  it('a rejected insert is logged, not swallowed', async () => {
    executions = [{ id: 'e1', workflow_id: 'wf', current_step_id: 's1', context: {} }];
    insertError = { message: 'boom' };
    await checkActiveWorkflowGoals('w1', 'c1', 'invoice_paid');
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ executionId: 'e1' }), 'executor.goal_termination.log_insert.failed');
  });
});
