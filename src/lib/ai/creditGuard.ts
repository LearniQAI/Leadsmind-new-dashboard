import { verifyAICreditBalance } from '@/server/middleware/CreditGuard';
import { createAdminClient } from '@/lib/supabase/server';
import { AppError, CreditLimitExceededError } from '@/shared/errors/AppError';

/**
 * Thin, typed wrapper around verifyAICreditBalance's Express-style
 * (req, res, next) signature — same shim shape used inline in
 * /api/v1/ai/content/generate/route.ts, pulled out here since two more
 * routes (revenue forecast, campaign recommendations) need the identical
 * call and inlining it three times would just be copy-pasted boilerplate.
 */
export async function runCreditGuard(
  workspaceId: string
): Promise<{ ok: true } | { ok: false; status: number; body: unknown }> {
  let nextCalled = false;
  let responseStatus = 200;
  let responseData: unknown = null;

  const mockReq = { body: { workspaceId } };
  const mockRes = {
    status(code: number) {
      responseStatus = code;
      return this;
    },
    json(data: unknown) {
      responseData = data;
      return this;
    },
  };
  const mockNext = () => {
    nextCalled = true;
  };

  await verifyAICreditBalance(mockReq, mockRes, mockNext);

  if (!nextCalled) {
    return { ok: false, status: responseStatus, body: responseData ?? { error: 'Unauthorized credit state' } };
  }
  return { ok: true };
}

/**
 * amount defaults to 1 (a single text generation). Pass a higher amount for
 * operations with a meaningfully higher real cost — e.g. image generation
 * (gpt-image-2 runs roughly 10x a gpt-4o-mini text call at 1024x1024 medium
 * quality: ~$0.05/image vs a fraction of a cent for a short completion).
 */
export async function consumeAICredit(workspaceId: string, amount: number = 1): Promise<void> {
  const supabase = createAdminClient();
  const { data: deducted, error } = await supabase.rpc('deduct_ai_credit', {
    p_workspace_id: workspaceId,
    p_amount: amount,
  });

  if (error) {
    throw new AppError('AI_CREDIT_DEDUCTION_FAILED', 'Could not process AI credit deduction.', 500);
  }

  if (!deducted) {
    throw new CreditLimitExceededError();
  }
}
