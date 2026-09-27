import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendEmail = vi.fn();
const logErr = vi.fn();

vi.mock('@/shared/logger', () => ({ logger: { error: (...a: any[]) => logErr(...a), info: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));
vi.mock('@/lib/email', async () => {
  const a: any = await vi.importActual('@/lib/email');
  return { ...a, sendEmail: (...x: any[]) => sendEmail(...x) };
});
let marketingConfig: any = { apiKey: 're_workspace', fromEmail: 'me@acme.com', fromName: 'A', postalAddress: '123 Main St, Cape Town', mode: 'managed' };
vi.mock('@/lib/email/resolveConfig', () => ({
  getWorkspaceEmailConfig: async () => ({ apiKey: 're_workspace', fromEmail: 'me@acme.com', fromName: 'A' }),
  // Form-workflow email resolves its sender with the domain-only resolver.
  getMarketingEmailConfig: async () => marketingConfig,
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

beforeEach(() => {
  sendEmail.mockReset();
  logErr.mockReset();
  marketingConfig = { apiKey: 're_workspace', fromEmail: 'me@acme.com', fromName: 'A', postalAddress: '123 Main St, Cape Town', mode: 'managed' };
});

describe('EmailAutomationService.sendWorkflowEmail postal address (CAN-SPAM) — 2026-09-27 legal-compliance fix', () => {
  it('refuses to send when the domain is verified but no postal address is set', async () => {
    marketingConfig = { ...marketingConfig, postalAddress: null };
    const r: any = await (EmailAutomationService as any).sendWorkflowEmail('w1', cfg, {});
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/postal address/i);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('renders the brand name and address in the sent HTML, never "LeadsMind"', async () => {
    marketingConfig = { ...marketingConfig, fromName: 'Acme Corp', postalAddress: '123 Main St, Cape Town' };
    sendEmail.mockResolvedValue({ id: 'm1' });
    await (EmailAutomationService as any).sendWorkflowEmail('w1', cfg, {});
    const html = sendEmail.mock.calls[0][0].html;
    expect(html).toContain('Sent by Acme Corp.');
    expect(html).toContain('123 Main St, Cape Town');
    expect(html).not.toContain('LeadsMind Forms');
    expect(html).not.toContain('LeadsMind Inc');
  });
});

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
