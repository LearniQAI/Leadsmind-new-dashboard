import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmail = vi.fn();
const logErr = vi.fn();

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/email', async () => {
  const a: any = await vi.importActual('@/lib/email');
  return { ...a, sendEmail: (...x: any[]) => sendEmail(...x) };
});
vi.mock('@/lib/email/resolveConfig', () => ({
  getWorkspaceEmailConfig: async () => ({ apiKey: 're_workspace', fromEmail: 'me@acme.com', fromName: 'A' }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => {
      const q: any = {
        insert: () => q, select: () => q, eq: () => q, ilike: () => q, limit: () => q,
        single: () => Promise.resolve({ data: null }),
        maybeSingle: () => Promise.resolve({ data: null }),
        then: (r: any) => r({ data: null, error: null }),
      };
      return q;
    },
  }),
}));

import { EmailAutomationService } from '@/lib/automations/EmailAutomationService';
import { EmailSendError } from '@/lib/email';

const SENSITIVE = 'connect ECONNREFUSED 10.0.0.5:5432 password authentication failed for user "svc_admin"';
const cfg = { templateType: 'confirmation', subject: 'Hi', body: 'Hello there, thanks for signing up.', toEmail: 'a@x.com' };

beforeEach(() => { sendEmail.mockReset(); logErr.mockReset(); });

describe('EmailAutomationService.sendWorkflowEmail error text (stored and shown in execution logs)', () => {
  it('echoes a provider rejection', async () => {
    sendEmail.mockImplementation(async () => { throw new EmailSendError('The to field must be a valid email address'); });
    const r: any = await (EmailAutomationService as any).sendWorkflowEmail('w1', cfg, {});
    expect(r.success).toBe(false);
    expect(r.error).toContain('The to field must be a valid email address');
  }, 20000);

  it('masks an internal/transport error but logs it', async () => {
    const internal = new Error(SENSITIVE);
    sendEmail.mockImplementation(async () => { throw internal; });
    const r: any = await (EmailAutomationService as any).sendWorkflowEmail('w1', cfg, {});
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/unexpected error/);
    expect(r.error).not.toMatch(/ECONNREFUSED|svc_admin|10\.0\.0\.5/);
    expect(logErr).toHaveBeenCalledWith(expect.objectContaining({ err: internal }), 'email_automation.send_attempt.failed');
  }, 20000);
});
