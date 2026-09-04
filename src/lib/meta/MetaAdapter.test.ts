import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// decrypt is exercised on the stored page token — stub it to identity so the
// adapter reaches the real fetch path.
vi.mock('@/lib/encryption', () => ({
  decrypt: (v: string) => v,
  encrypt: (v: string) => v,
}));

import { MetaAdapter } from './MetaAdapter';

const IG_CREDS = { instagram_id: 'ig_17841400000000000', page_access_token_encrypted: 'tok' };
const FB_CREDS = { page_id: '900000000000000', page_access_token_encrypted: 'tok' };

describe('MetaAdapter — Graph error preservation (Message Delivery Reliability Part 1)', () => {
  const realFetch = global.fetch;
  beforeEach(() => { global.fetch = vi.fn() as any; });
  afterEach(() => { global.fetch = realFetch; vi.restoreAllMocks(); });

  it('sendInstagram: a Graph API error response is returned structured, not swallowed', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          message: '(#10) This message is sent outside of allowed window.',
          type: 'OAuthException',
          code: 10,
          error_subcode: 2534022,
          fbtrace_id: 'A1b2C3d4',
        },
      }),
    });

    const res = await new MetaAdapter(IG_CREDS).sendInstagram('igsid_123', 'hi');

    expect(res.success).toBe(false);
    expect(res.error).toContain('#10');
    expect(res.errorCode).toBe(10);
    expect(res.errorSubcode).toBe(2534022);
    expect(res.errorType).toBe('OAuthException');
    expect(res.fbtraceId).toBe('A1b2C3d4');
    expect(res.httpStatus).toBe(400);
  });

  it('sendInstagram: success returns the provider message id', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ recipient_id: 'igsid_123', message_id: 'mid.abc' }),
    });

    const res = await new MetaAdapter(IG_CREDS).sendInstagram('igsid_123', 'hi');
    expect(res).toEqual({ success: true, externalId: 'mid.abc' });
  });

  it('sendInstagram: a transport failure (fetch throws) is tagged errorType=transport', async () => {
    (global.fetch as any).mockRejectedValue(new Error('ECONNRESET'));

    const res = await new MetaAdapter(IG_CREDS).sendInstagram('igsid_123', 'hi');
    expect(res.success).toBe(false);
    expect(res.errorType).toBe('transport');
    expect(res.error).toBe('ECONNRESET');
  });

  it('sendFacebook: 200 body carrying an error object is still treated as a failure', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: { message: 'Invalid OAuth access token.', code: 190 } }),
    });

    const res = await new MetaAdapter(FB_CREDS).sendFacebook('psid_1', 'hi');
    expect(res.success).toBe(false);
    expect(res.errorCode).toBe(190);
  });
});
