import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { resendSend } = vi.hoisted(() => ({ resendSend: vi.fn() }));

vi.mock('resend', () => ({
  Resend: vi.fn(function ResendMock() {
    return { emails: { send: resendSend } };
  }),
}));

import { sendEmail } from './email';

describe('sendEmail', () => {
  const originalApiKey = process.env.RESEND_API_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
  });

  it.each([undefined, 're_123', 'RE_PLACEHOLDER_KEY'])('throws instead of returning a mock success for %s', async (apiKey) => {
    if (apiKey) process.env.RESEND_API_KEY = apiKey;

    await expect(sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }))
      .rejects.toThrow('valid Resend API key is not configured');
    expect(resendSend).not.toHaveBeenCalled();
  });

  it('returns Resend\'s actual response after a successful provider call', async () => {
    process.env.RESEND_API_KEY = 're_valid_test_key';
    resendSend.mockResolvedValue({ data: { id: 'real_resend_id' }, error: null });

    await expect(sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }))
      .resolves.toEqual({ id: 'real_resend_id' });
  });

  it('throws the provider error rather than returning a successful result', async () => {
    process.env.RESEND_API_KEY = 're_valid_test_key';
    resendSend.mockResolvedValue({ data: null, error: { message: 'Invalid API key' } });

    await expect(sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }))
      .rejects.toThrow('Invalid API key');
  });

  it('throws a transport exception rather than returning a successful result', async () => {
    process.env.RESEND_API_KEY = 're_valid_test_key';
    resendSend.mockRejectedValue(new Error('Network unavailable'));

    await expect(sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' }))
      .rejects.toThrow('Network unavailable');
  });

  it('maps the `replyTo` param to Resend\'s dedicated replyTo field (NOT a headers Reply-To, which Resend drops)', async () => {
    process.env.RESEND_API_KEY = 're_valid_test_key';
    resendSend.mockResolvedValue({ data: { id: 'x' }, error: null });

    await sendEmail({
      to: 'recipient@example.com',
      subject: 'Test',
      text: 'Test',
      replyTo: 'acme@inbox.leadsmind.io',
    });

    expect(resendSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'acme@inbox.leadsmind.io' }),
    );
  });

  it('omits replyTo entirely when not provided', async () => {
    process.env.RESEND_API_KEY = 're_valid_test_key';
    resendSend.mockResolvedValue({ data: { id: 'x' }, error: null });

    await sendEmail({ to: 'recipient@example.com', subject: 'Test', text: 'Test' });

    expect(resendSend.mock.calls[0][0].replyTo).toBeUndefined();
  });

  afterAll(() => {
    if (originalApiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalApiKey;
  });
});
