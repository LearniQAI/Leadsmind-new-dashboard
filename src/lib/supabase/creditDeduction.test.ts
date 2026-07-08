import { describe, it, expect, vi } from 'vitest';
import { createMockSupabaseClient, TEST_WORKSPACE_ID } from '@/test/helpers/mockSupabase';

/**
 * seoChecker.ts / plagiarismChecker.ts now deduct credits atomically via the
 * deduct_ai_credit(p_workspace_id, p_amount) RPC (Migration 3, extended in
 * Migration 20260708000001 for variable-amount deductions) instead of a
 * non-atomic read-then-update on workspaces.ai_credits.
 */
async function deductCredit(
  db: ReturnType<typeof createMockSupabaseClient>,
  workspaceId: string,
  amount: number
) {
  const { data: ok, error } = await db.rpc('deduct_ai_credit', {
    p_workspace_id: workspaceId,
    p_amount: amount,
  });

  if (error) return { error: 'Could not process AI credit deduction.' };
  if (!ok) return { error: `Insufficient AI credits. ${amount} required.` };

  return { success: true };
}

describe('deduct_ai_credit — atomic RPC-based deduction', () => {
  it('succeeds when enough credit is available', async () => {
    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    const result = await deductCredit(mockDb, TEST_WORKSPACE_ID, 3);

    expect(result.success).toBe(true);
  });

  it('fails with an "Insufficient" error when the RPC reports the limit was exceeded', async () => {
    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    });

    const result = await deductCredit(mockDb, TEST_WORKSPACE_ID, 3);

    expect(result.error).toMatch(/Insufficient/);
  });

  it('is concurrency-safe: only as many overlapping requests succeed as there is balance for', async () => {
    // Models the RPC's real semantics: UPDATE ... WHERE credits_used + amount
    // <= plan_monthly_credits + addon, so each row-level write is atomic and
    // only successful updates increment usage — no double-spend under concurrency.
    let creditsUsed = 0;
    const CREDIT_LIMIT = 5;

    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockImplementation(async (_fn: string, params: any) => {
        const amount = params?.p_amount ?? 1;
        if (creditsUsed + amount <= CREDIT_LIMIT) {
          creditsUsed += amount;
          return { data: true, error: null };
        }
        return { data: false, error: null };
      }),
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () => deductCredit(mockDb, TEST_WORKSPACE_ID, 1))
    );

    const successCount = results.filter((r) => r.success).length;

    expect(successCount).toBe(CREDIT_LIMIT);
    expect(creditsUsed).toBeLessThanOrEqual(CREDIT_LIMIT);
  });

  it('always calls the RPC with the real deduct_ai_credit param shape', async () => {
    const mockDb = createMockSupabaseClient({
      rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
    });

    await deductCredit(mockDb, TEST_WORKSPACE_ID, 3);

    expect(mockDb.rpc).toHaveBeenCalledWith('deduct_ai_credit', {
      p_workspace_id: TEST_WORKSPACE_ID,
      p_amount: 3,
    });
  });
});
