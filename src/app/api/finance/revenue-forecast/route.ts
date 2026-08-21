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
  addPeriods,
  MIN_PERIODS_FOR_FORECAST,
  type CurrencyRevenueSeries,
  type Granularity,
} from '@/lib/finance/revenueForecast';

export const dynamic = 'force-dynamic';

const ALLOWED_FINANCE_ROLES = ['admin', 'owner'];
// Single per-workspace cooldown regardless of granularity/horizon selection —
// switching from "weekly" to "monthly" and regenerating immediately would
// otherwise be a trivial cooldown bypass, and this is still one real LLM call
// either way, so there's no cost-based reason to track it per-combination.
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour, per-workspace
const FORECAST_MODEL = 'gpt-4o-mini';

const VALID_GRANULARITIES: Granularity[] = ['weekly', 'monthly'];
// Sane bounds per granularity so the LLM is never asked for something absurd
// (e.g. 52 weeks off 3 weeks of data) — enforced server-side, not just a UI limit.
const HORIZON_BOUNDS: Record<Granularity, [number, number]> = { weekly: [1, 12], monthly: [1, 6] };

interface ForecastPeriod {
  period: string;
  projectedTotal: number;
}

interface CurrencyForecast {
  currency: string;
  periods: ForecastPeriod[];
  reasoning: string;
}

function buildPrompt(series: CurrencyRevenueSeries[], granularity: Granularity, horizonPeriods: number) {
  const unit = granularity === 'weekly' ? 'week' : 'month';
  const currencyBlocks = series
    .filter(s => s.periods.length >= MIN_PERIODS_FOR_FORECAST)
    .map(s => {
      const trend = computeTrendStats(s.periods);
      const lastPeriod = s.periods[s.periods.length - 1].period;
      return {
        currency: s.currency,
        history: s.periods.map(p => ({ period: p.period, total: p.total, invoiceCount: p.invoiceCount })),
        periodGrowthRatesPercent: trend.periodGrowthRates,
        avgGrowthRatePercent: trend.avgGrowthRate,
        movingAverage: trend.movingAverage,
        nextPeriodLabels: Array.from({ length: horizonPeriods }, (_, i) => addPeriods(lastPeriod, i + 1, granularity)),
      };
    });

  const systemInstructions = [
    'You are a financial forecasting assistant for LeadsMind, a South African SME CRM/finance platform.',
    `You will be given REAL historical ${unit}ly paid-invoice revenue totals per currency, plus growth-rate and moving-average statistics that have already been computed correctly in code.`,
    'Your job is reasoning and narrative ONLY — do not recompute or contradict the provided statistics, and do not invent numbers that are not derivable from the given history and trend stats.',
    `For each currency block, project revenue for the next ${horizonPeriods} ${unit}${horizonPeriods === 1 ? '' : 's'}, using each block's own "nextPeriodLabels" array as the EXACT period labels to use, in that exact order — one projected total per label. Numbers should be sane, non-negative, and roughly consistent with avgGrowthRatePercent applied to the recent moving average — not wild extrapolations.`,
    'Also provide a short (2-4 sentence) plain-English explanation of your reasoning and key assumptions for each currency, written for a small-business owner, not a data scientist.',
    'Respond with STRICT JSON ONLY, matching this exact shape, with one array entry per input currency block, and no markdown formatting:',
    '{"currencies":[{"currency":"ZAR","periods":[{"period":"YYYY-MM or YYYY-Www","projectedTotal":0}],"reasoning":"..."}]}',
  ].join('\n');

  const userContext = JSON.stringify({ granularity, horizonPeriods, currencies: currencyBlocks }, null, 2);

  return { systemInstructions, userContext, currencyBlocks };
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const body = await req.json();
    const granularity = body.granularity as Granularity;
    if (!VALID_GRANULARITIES.includes(granularity)) {
      return NextResponse.json({ error: 'Invalid granularity. Choose "weekly" or "monthly".', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    const horizonPeriods = Number(body.horizonPeriods);
    const [minHorizon, maxHorizon] = HORIZON_BOUNDS[granularity];
    const unitWord = granularity === 'weekly' ? 'weeks' : 'months';
    if (!Number.isInteger(horizonPeriods) || horizonPeriods < minHorizon || horizonPeriods > maxHorizon) {
      return NextResponse.json(
        { error: `Horizon must be between ${minHorizon} and ${maxHorizon} ${unitWord} for ${granularity} granularity.`, code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const rangeStart = typeof body.rangeStart === 'string' && body.rangeStart ? body.rangeStart : undefined;
    const rangeEnd = typeof body.rangeEnd === 'string' && body.rangeEnd ? body.rangeEnd : undefined;
    if (rangeStart && Number.isNaN(new Date(rangeStart).getTime())) {
      return NextResponse.json({ error: 'Invalid start date.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (rangeEnd && Number.isNaN(new Date(rangeEnd).getTime())) {
      return NextResponse.json({ error: 'Invalid end date.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }
    if (rangeStart && rangeEnd && new Date(rangeStart) > new Date(rangeEnd)) {
      return NextResponse.json({ error: 'Start date must be before end date.', code: 'VALIDATION_ERROR' }, { status: 400 });
    }

    // 1. Server-side cooldown — checked against the last real row in the DB,
    // not a client-supplied flag, so it can't be bypassed by refreshing the UI
    // (or by switching granularity — see COOLDOWN_MS comment above).
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
    // to hallucinate a forecast from near-nothing. Granularity-aware: a
    // workspace can clear the weekly bar long before the monthly one.
    const series = await getHistoricalRevenueByCurrency(workspaceId, granularity, rangeStart, rangeEnd);
    if (!hasSufficientHistory(series)) {
      const bestCount = series.reduce((max, s) => Math.max(max, s.periods.length), 0);
      return NextResponse.json(
        {
          error: `At least ${MIN_PERIODS_FOR_FORECAST} ${unitWord} of paid invoices in the same currency are needed for a ${granularity} forecast (currently ${bestCount}). Keep invoicing, widen the date range, or switch to monthly view.`,
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
    const { systemInstructions, userContext, currencyBlocks } = buildPrompt(series, granularity, horizonPeriods);

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

    const forecastResult = {
      currencies: parsed.currencies ?? [],
      modelUsed: FORECAST_MODEL,
      granularity,
      horizonPeriods,
      rangeMode: rangeStart || rangeEnd ? 'custom' : 'default',
      rangeStart: rangeStart ?? null,
      rangeEnd: rangeEnd ?? null,
    };
    const expiresAt = new Date(Date.now() + COOLDOWN_MS).toISOString();

    const { data: inserted, error: insertError } = await adminClient
      .from('revenue_forecasts')
      .insert({
        workspace_id: workspaceId,
        requested_by: userId,
        input_data_snapshot: { granularity, horizonPeriods, rangeStart: rangeStart ?? null, rangeEnd: rangeEnd ?? null, currencies: currencyBlocks },
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

    const { searchParams } = new URL(req.url);
    const granularityParam = searchParams.get('granularity');
    const granularity: Granularity = granularityParam === 'weekly' ? 'weekly' : 'monthly';
    const rangeStart = searchParams.get('rangeStart') || undefined;
    const rangeEnd = searchParams.get('rangeEnd') || undefined;

    const { data: latest, error } = await adminClient
      .from('revenue_forecasts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;

    const series = await getHistoricalRevenueByCurrency(workspaceId, granularity, rangeStart, rangeEnd);
    const hasEnoughData = hasSufficientHistory(series);

    // The latest forecast is only directly renderable against THIS view if it
    // was generated at the same granularity — its period labels (e.g.
    // "2026-W34" vs "2026-08") otherwise won't line up with this view's
    // historical x-axis. The frontend uses this flag to prompt a fresh
    // generation for the current view instead of rendering a mismatched one.
    const forecastMatchesView = latest?.forecast_result?.granularity === granularity;

    return NextResponse.json({
      forecast: latest ?? null,
      forecastMatchesView,
      history: series,
      hasEnoughData,
      minPeriodsRequired: MIN_PERIODS_FOR_FORECAST,
      granularity,
    });
  } catch (error: any) {
    logger.error({ err: error }, 'revenue.forecast.get.failed');
    const clientError = toClientError(error);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
