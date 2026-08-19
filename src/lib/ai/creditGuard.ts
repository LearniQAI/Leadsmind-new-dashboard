import { verifyAICreditBalance } from '@/server/middleware/CreditGuard';
import { db } from '@/server/database/datasource';

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

export async function consumeAICredit(workspaceId: string): Promise<void> {
  await db('ai_usage_credits').where({ workspace_id: workspaceId }).increment('credits_used_this_period', 1);
}
