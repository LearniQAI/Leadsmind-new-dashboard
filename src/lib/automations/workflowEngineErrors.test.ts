import { describe, it, expect, vi, beforeEach } from 'vitest';

const logErr = vi.fn();
const sendWorkflowEmail = vi.fn();
vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/automations/EmailAutomationService', () => ({
  EmailAutomationService: { sendWorkflowEmail: (...a: any[]) => sendWorkflowEmail(...a), interpolate: (s: string) => s },
}));
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({}) }));
vi.mock('@/lib/crm/UnifiedActivityEngine', () => ({ UnifiedActivityEngine: { logActivity: vi.fn() } }));

import { WorkflowEngine } from '@/lib/automations/WorkflowEngine';
import { EmailSendError } from '@/lib/email';

const step: any = { id: 's1', type: 'send_email', config: { subject: 'x', body: 'y' } };
const ctx: any = { workspaceId: 'w1', values: {}, formName: 'F' };
beforeEach(() => { logErr.mockReset(); sendWorkflowEmail.mockReset(); });

describe('WorkflowEngine.executeStep crash path (persisted as run.error_message)', () => {
  it('masks an internal exception and logs the real one', async () => {
    const internal = new Error('relation "workflow_executions" does not exist at 10.0.0.5:5432');
    sendWorkflowEmail.mockImplementation(async () => { throw internal; });
    const r: any = await WorkflowEngine.executeStep(step, ctx, 'c1');
    expect(r).toEqual({ success: false, error: 'Workflow step failed unexpectedly.' });
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'workflow_engine.step_executor.crashed');
  });

  it('shows a user-safe error as-is', async () => {
    sendWorkflowEmail.mockImplementation(async () => {
      throw new EmailSendError('Email delivery is unavailable for this workspace — connect a Resend account before sending automated emails.');
    });
    const r: any = await WorkflowEngine.executeStep(step, ctx, 'c1');
    expect(r.error).toMatch(/connect a Resend account/);
  });
});
