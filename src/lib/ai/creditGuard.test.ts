import { describe, expect, it, vi, beforeEach } from 'vitest';

const rpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ rpc }),
}));

vi.mock('@/server/middleware/CreditGuard', () => ({
  verifyAICreditBalance: vi.fn(),
}));

import { consumeAICredit } from './creditGuard';

describe('consumeAICredit', () => {
  beforeEach(() => rpc.mockReset());

  it('uses the atomic deduct_ai_credit RPC with the requested amount', async () => {
    rpc.mockResolvedValue({ data: true, error: null });

    await consumeAICredit('00000000-0000-0000-0000-000000000000', 2);

    expect(rpc).toHaveBeenCalledWith('deduct_ai_credit', {
      p_workspace_id: '00000000-0000-0000-0000-000000000000',
      p_amount: 2,
    });
  });

  it('rejects rather than silently succeeding when the credit ceiling is reached', async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    await expect(consumeAICredit('00000000-0000-0000-0000-000000000000'))
      .rejects.toMatchObject({ code: 'CREDIT_LIMIT_EXCEEDED', httpStatus: 402 });
  });

  it('does not mask RPC failures as a successful credit consumption', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'RPC unavailable' } });

    await expect(consumeAICredit('00000000-0000-0000-0000-000000000000'))
      .rejects.toMatchObject({ code: 'AI_CREDIT_DEDUCTION_FAILED', httpStatus: 500 });
  });
});
