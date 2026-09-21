import { describe, it, expect, vi } from 'vitest';

const logErr = vi.fn();
const updates: { table: string; p: any }[] = [];
const SENSITIVE = 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"';

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/automation/actions_registry', () => ({ AutomationActions: {} }));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from(table: string) {
      // The route step fetches the contact — simulate the DB failing there.
      if (table === 'contacts') throw new Error(SENSITIVE);
      const rows: Record<string, any> = {
        workflow_executions: { id: 'e1', status: 'running', current_step_id: 's1', workspace_id: 'w1', contact_id: 'c1', context: {}, workflow: { id: 'wf', goal_event_type: 'none' } },
        workflow_steps: { id: 's1', type: 'route', config: { branches: [] } },
        workflow_step_logs: { id: 'l1' },
      };
      const q: any = {
        select: () => q, insert: () => q, eq: () => q, limit: () => q,
        update: (p: any) => { updates.push({ table, p }); return q; },
        single: () => Promise.resolve({ data: rows[table] ?? null }),
        then: (r: any) => r({ data: rows[table] ?? null, error: null }),
      };
      return q;
    },
  }),
}));

import { processNextStep } from '@/lib/automation/executor';

describe('executor.processNextStep failure path (persisted as run.error_message, shown in ExecutionLogs)', () => {
  it('stores only a masked message for an internal error, and logs the real one', async () => {
    await processNextStep('e1');
    const failed = updates.filter((u) => u.table === 'workflow_executions' && u.p.status === 'failed');
    expect(failed.length).toBe(1);
    expect(failed[0].p.error_message).toBe('Step route failed: The step failed unexpectedly.');
    expect(JSON.stringify(updates)).not.toMatch(/ECONNREFUSED|svc_admin|10\.0\.0\.5/);
    expect(logErr).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.objectContaining({ message: SENSITIVE }) }),
      'executor.step.failed',
    );
  });
});
