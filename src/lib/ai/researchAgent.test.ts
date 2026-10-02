import { beforeEach, describe, expect, it, vi } from 'vitest';

const consumeAICredit = vi.fn();
const refundAICredit = vi.fn();
vi.mock('@/lib/ai/creditGuard', () => ({
  consumeAICredit: (...a: unknown[]) => consumeAICredit(...a),
  refundAICredit: (...a: unknown[]) => refundAICredit(...a),
}));
vi.mock('@/shared/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }, safeLog: (fn: () => void) => fn() }));

let cacheRow: any = null;
const inserted: any[] = [];
vi.mock('@/server/database/datasource', () => {
  const chain: any = {};
  for (const m of ['select', 'eq', 'gt', 'order', 'limit']) chain[m] = () => chain;
  chain.maybeSingle = async () => ({ data: cacheRow });
  return {
    supabase: { from: () => chain },
    db: (table: string) => ({
      where: () => ({ first: async () => null }),
      insert: async (row: any) => { inserted.push({ table, row }); return [row]; },
    }),
  };
});

const create = vi.fn();
vi.mock('openai', () => ({ default: class { chat = { completions: { create: (...a: unknown[]) => create(...a) } }; } }));

import { ResearchAgent, ResearchFailedError, RESEARCH_REPORT_SCHEMA_VERSION } from '@/server/services/ai/ResearchAgent';
import { CreditLimitExceededError } from '@/shared/errors/AppError';

const GOOD = { professional_summary: 'Heads operations.', likely_role: 'COO', strategic_focus_areas: ['ops'], inferred_pain_points: [], suggested_conversation_openers: ['Ask about ops.'] };
const run = () => ResearchAgent.enrichContact('c1', 'Ada Lovelace', 'Acme', 'acme.com', 'ws1', 'req1', { chargeCredit: true });
const savedReports = () => inserted.filter((i) => i.table === 'ai_research_reports');

beforeEach(() => {
  vi.clearAllMocks();
  inserted.length = 0;
  cacheRow = null;
  process.env.OPENAI_API_KEY = 'sk-test';
  consumeAICredit.mockResolvedValue(undefined);
  refundAICredit.mockResolvedValue(true);
});

describe('ResearchAgent.enrichContact', () => {
  it('success: charges once, saves a versioned report with no fabricated score, no refund', async () => {
    create.mockResolvedValue({ choices: [{ message: { content: JSON.stringify(GOOD) } }], usage: { total_tokens: 10 } });
    const report = await run();
    expect(consumeAICredit).toHaveBeenCalledTimes(1);
    expect(refundAICredit).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledTimes(1);
    const saved = savedReports()[0].row;
    expect(saved.lead_score).toBeNull();
    expect(saved.report_json.schema_version).toBe(RESEARCH_REPORT_SCHEMA_VERSION);
    expect(JSON.stringify(report)).not.toMatch(/zafro|johannesburg/i);
  });

  it('OpenAI timeout: typed failure, nothing saved, credit refunded once', async () => {
    const e: any = new Error('timed out');
    e.name = 'APIConnectionTimeoutError';
    create.mockRejectedValue(e);
    await expect(run()).rejects.toMatchObject({ name: 'ResearchFailedError', code: 'timeout' });
    expect(savedReports()).toHaveLength(0);
    expect(consumeAICredit).toHaveBeenCalledTimes(1);
    expect(refundAICredit).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['empty content', { choices: [{ message: { content: '' } }] }, 'empty_result'],
    ['malformed JSON', { choices: [{ message: { content: '{nope' } }] }, 'invalid_result'],
    ['all-empty object', { choices: [{ message: { content: '{"professional_summary":"","strategic_focus_areas":[]}' } }] }, 'empty_result'],
  ])('%s: failure, no saved report, refunded', async (_n, resp, code) => {
    create.mockResolvedValue(resp);
    await expect(run()).rejects.toMatchObject({ code });
    expect(savedReports()).toHaveLength(0);
    expect(refundAICredit).toHaveBeenCalledTimes(1);
  });

  it('out of credits: fails before any model call and refunds nothing', async () => {
    consumeAICredit.mockRejectedValue(new CreditLimitExceededError());
    await expect(run()).rejects.toMatchObject({ code: 'insufficient_credits' });
    expect(create).not.toHaveBeenCalled();
    expect(refundAICredit).not.toHaveBeenCalled();
  });

  it('cache hit is free and does not call the model', async () => {
    cacheRow = { report_json: { schema_version: 2, cached: true } };
    expect(await run()).toEqual({ schema_version: 2, cached: true });
    expect(consumeAICredit).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
  });

  it('failure type is ResearchFailedError', async () => {
    create.mockRejectedValue(new Error('boom'));
    await expect(run()).rejects.toBeInstanceOf(ResearchFailedError);
  });
});
