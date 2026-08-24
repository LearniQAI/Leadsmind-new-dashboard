import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const upsert = vi.fn();
const requireWorkspaceRole = vi.fn();

vi.mock('@/lib/api/workspaceAuth', () => ({
  requireWorkspaceRole: (...args: unknown[]) => requireWorkspaceRole(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    from: () => ({ upsert }),
  }),
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }) }),
  }),
}));

vi.mock('@/lib/encryption', () => ({ encrypt: (v: string) => `enc:${v}` }));
vi.mock('@/lib/stripe', () => ({ stripe: {} }));
vi.mock('@/lib/paymentGateways/paystackGateway', () => ({ validatePaystackKey: vi.fn() }));
vi.mock('@/lib/paymentGateways/flutterwaveGateway', () => ({ validateFlutterwaveKey: vi.fn() }));
vi.mock('@/lib/paymentGateways/ozowGateway', () => ({ validateOzowCredentials: vi.fn() }));

import { POST } from './route';

function postRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/settings/integrations', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/settings/integrations — OAuth-gateway overwrite guard', () => {
  beforeEach(() => {
    upsert.mockReset().mockResolvedValue({ error: null });
    requireWorkspaceRole.mockReset().mockResolvedValue({
      workspaceId: 'b83f0966-837e-4952-9cd4-480be4ca3f16',
      userId: 'u1',
      role: 'admin',
    });
  });

  it('rejects the generic credential form for provider "stripe" and never calls upsert', async () => {
    const res = await POST(postRequest({
      provider: 'stripe',
      category: 'payment_gateway',
      accountLabel: 'fake',
      credentials: { apiKey: 'sk_fake', apiSecret: 'fake_secret' },
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/OAuth flow/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects the generic credential form for provider "paypal" and never calls upsert', async () => {
    const res = await POST(postRequest({
      provider: 'paypal',
      category: 'payment_gateway',
      accountLabel: 'fake',
      credentials: { apiKey: 'fake', apiSecret: 'fake' },
    }));

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/OAuth flow/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('is case-insensitive: "Stripe" / "PayPal" are also rejected, not just lowercase', async () => {
    const res1 = await POST(postRequest({ provider: 'Stripe', category: 'payment_gateway', credentials: { apiKey: 'x', apiSecret: 'y' } }));
    const res2 = await POST(postRequest({ provider: 'PayPal', category: 'payment_gateway', credentials: { apiKey: 'x', apiSecret: 'y' } }));
    expect(res1.status).toBe(400);
    expect(res2.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('still allows the real bring-your-own-key gateways (paystack) through this branch', async () => {
    const res = await POST(postRequest({
      provider: 'paystack',
      category: 'payment_gateway',
      accountLabel: 'Main',
      credentials: { secretKey: 'sk_test_123' },
    }));

    expect(res.status).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload] = upsert.mock.calls[0];
    expect(payload.provider).toBe('paystack');
    expect(payload.credentials.secret_key_encrypted).toBe('enc:sk_test_123');
  });
});
