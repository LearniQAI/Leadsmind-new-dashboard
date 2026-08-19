import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { runCreditGuard, consumeAICredit } from '@/lib/ai/creditGuard';
import {
  getHistoricalRevenueByCurrency,
  computeTrendStats,
  hasSufficientHistory,
  MIN_MONTHS_FOR_FORECAST,
  type CurrencyRevenueSeries,
} from '@/lib/finance/revenueForecast';

export const dynamic = 'force-dynamic';

const ALLOWED_FINANCE_ROLES = ['admin', 'owner'];
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour, per-workspace
const FORECAST_MODEL = 'gpt-4o-mini';

interface ForecastPeriod {
  month: string;
  projectedTotal: number;
}

interface CurrencyForecast {
  currency: string;
  next1Month: ForecastPeriod[];
  next3Months: ForecastPeriod[];
  next6Months: ForecastPeriod[];
  reasoning: string;
}

function addMonths(yyyyMm: string, count: number): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + count, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildPrompt(series: CurrencyRevenueSeries[]) {
  const currencyBlocks = series
    .filter(s => s.months.length >= MIN_MONTHS_FOR_FORECAST)
    .map(s => {
      const trend = computeTrendStats(s.months);
      return {
        currency: s.currency,
        history: s.months.map(m => ({ month: m.month, total: m.total, invoiceCount: m.invoiceCount })),
        momGrowthRatesPercent: trend.momGrowthRates,
        avgGrowthRatePercent: trend.avgGrowthRate,
        threeMonthMovingAverage: trend.movingAverage,
        nextMonthLabel: addMonths(s.months[s.months.length - 1].month, 1),
      };
    });

  const systemInstructions = [
    'You are a financial forecasting assistant for LeadsMind, a South African SME CRM/finance platform.',
    'You will be given REAL historical monthly paid-invoice revenue totals per currency, plus growth-rate and moving-average statistics that have already been computed correctly in code.',
    'Your job is reasoning and narrative ONLY — do not recompute or contradict the provided statistics, and do not invent numbers that are not derivable from the given history and trend stats.',
    'For each currency block, project revenue for the next 1 month, next 3 months, and next 6 months, using the provided history and trend stats as your basis. Numbers should be sane, non-negative, and roughly consistent with avgGrowthRatePercent applied to the recent moving average — not wild extrapolations.',
    'Also provide a short (2-4 sentence) plain-English explanation of your reasoning and key assumptions for each currency, written for a small-business owner, not a data scientist.',
    'Respond with STRICT JSON ONLY, matching this exact shape, with one array entry per input currency block, and no markdown formatting:',
    '{"currencies":[{"currency":"ZAR","next1Month":[{"month":"YYYY-MM","projectedTotal":0}],"next3Months":[{"month":"YYYY-MM","projectedTotal":0}],"next6Months":[{"month":"YYYY-MM","projectedTotal":0}],"reasoning":"..."}]}',
  ].join('\n');

  const userContext = JSON.stringify({ currencies: currencyBlocks }, null, 2);

  return { systemInstructions, userContext, currencyBlocks };
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    // 1. Server-side cooldown — checked against the last real row in the DB,
    // not a client-supplied flag, so it can't be bypassed by refreshing the UI.
    const { data: lastForecast, error: lastError } = await adminClient
      .from('revenue_forecasts')
      .select('created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastError) throw lastError;

    if (lastForecast) {
      const elapsedMs = Date.now() - new Date(lastForecast.created_at).getTime();
      if (elapsedMs < COOLDOWN_MS) {
        const retryAfterSeconds = Math.ceil((COOLDOWN_MS - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: 'A forecast was generated recently. Please wait before regenerating.',
            code: 'COOLDOWN_ACTIVE',
            retryAfterSeconds,
          },
          { status: 429 }
        );
      }
    }

    // 2. Real historical data check — fail clearly rather than asking the LLM
    // to hallucinate a forecast from near-nothing.
    const series = await getHistoricalRevenueByCurrency(workspaceId);
    if (!hasSufficientHistory(series)) {
      return NextResponse.json(
        {
          error: `At least ${MIN_MONTHS_FOR_FORECAST} months of paid invoices are needed to generate a forecast. Keep invoicing and check back once you have more history.`,
          code: 'INSUFFICIENT_HISTORY',
        },
        { status: 422 }
      );
    }

    // 3. Credit/rate-limit guard, same mechanism as the "Write with AI" feature.
    const guardResult = await runCreditGuard(workspaceId);
    if (guardResult.ok === false) {
      return NextResponse.json(guardResult.body as object, { status: guardResult.status });
    }

    // 4. Build prompt from server-computed trend stats (not LLM-computed math).
    const { systemInstructions, userContext, currencyBlocks } = buildPrompt(series);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: FORECAST_MODEL,
      messages: [
        { role: 'system', content: systemInstructions },
        { role: 'user', content: userContext },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    const tokensUsed = completion.usage?.total_tokens || 0;

    let parsed: { currencies?: CurrencyForecast[] };
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      logger.error({ rawContent }, 'revenue.forecast.parse.failed');
      return NextResponse.json(
        { error: 'The AI returned an unexpected response. Please try again.', code: 'AI_RESPONSE_INVALID' },
        { status: 502 }
      );
    }

    const forecastResult = { currencies: parsed.currencies ?? [], modelUsed: FORECAST_MODEL };
    const expiresAt = new Date(Date.now() + COOLDOWN_MS).toISOString();

    const { data: inserted, error: insertError } = await adminClient
      .from('revenue_forecasts')
      .insert({
        workspace_id: workspaceId,
        requested_by: userId,
        input_data_snapshot: { currencies: currencyBlocks },
        forecast_result: forecastResult,
        model_used: FORECAST_MODEL,
        tokens_used: tokensUsed,
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (insertError) throw insertError;

    await consumeAICredit(workspaceId);

    return NextResponse.json(inserted);
  } catch (error: any) {
    logger.error({ err: error }, 'revenue.forecast.generate.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { data: latest, error } = await adminClient
      .from('revenue_forecasts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    const series = await getHistoricalRevenueByCurrency(workspaceId);
    const hasEnoughData = hasSufficientHistory(series);

    return NextResponse.json({
      forecast: latest ?? null,
      history: series,
      hasEnoughData,
      minMonthsRequired: MIN_MONTHS_FOR_FORECAST,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'revenue.forecast.get.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
