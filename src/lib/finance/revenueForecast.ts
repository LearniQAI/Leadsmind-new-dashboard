import { createAdminClient } from '@/lib/supabase/server';

export type Granularity = 'weekly' | 'monthly';

export interface RevenuePeriodPoint {
  /** 'YYYY-MM' for monthly granularity, ISO week 'YYYY-Www' for weekly. */
  period: string;
  total: number;
  invoiceCount: number;
}

export interface CurrencyRevenueSeries {
  currency: string;
  periods: RevenuePeriodPoint[];
}

export interface TrendStats {
  /** Period-over-period growth rate (%) between each consecutive pair of periods —
   * "period" because the unit is whatever granularity was selected (week or month),
   * not always month-over-month. */
  periodGrowthRates: number[];
  /** Average of periodGrowthRates. */
  avgGrowthRate: number;
  /** Simple moving average (window = min(3, periods available)), one value per
   * period once enough history exists. */
  movingAverage: { period: string; value: number }[];
  latestPeriodTotal: number;
}

// Same "need enough points for a real trend" principle applied uniformly across
// weekly/monthly/custom-range — 3 is also the moving-average window size, so
// it's the real mathematical floor below which a "trend" isn't meaningful.
const MIN_PERIODS_FOR_FORECAST = 3;

// Default lookback when the user hasn't picked a custom date range: 12 months
// for monthly (unchanged from before), 16 weeks (~4 months) for weekly — wide
// enough to comfortably clear the 3-period minimum for a workspace that has
// been invoicing weekly for even a short while.
const DEFAULT_LOOKBACK_PERIODS: Record<Granularity, number> = { weekly: 16, monthly: 12 };

/** ISO-8601 week label, e.g. "2026-W34". Monday-start weeks, week 1 = the
 * week containing the year's first Thursday (the standard ISO definition). */
export function getIsoWeekLabel(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7; // Mon=0 .. Sun=6
  d.setUTCDate(d.getUTCDate() - dayNum + 3); // move to this week's Thursday
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const weekNum = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 3600 * 1000));
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function isoWeekLabelToDate(label: string): Date {
  const [yearStr, weekStr] = label.split('-W');
  const year = Number(yearStr);
  const week = Number(weekStr);
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstThursdayDayNum = (firstThursday.getUTCDay() + 6) % 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() - firstThursdayDayNum + 3);
  const target = new Date(firstThursday);
  target.setUTCDate(firstThursday.getUTCDate() + (week - 1) * 7);
  return target;
}

function getPeriodLabel(dateStr: string, granularity: Granularity): string {
  if (granularity === 'monthly') return dateStr.slice(0, 7);
  return getIsoWeekLabel(new Date(dateStr));
}

/** Returns the period label `count` periods after `periodLabel`, in the same
 * granularity — used both to ask the LLM for exact next-period labels and to
 * compute the default lookback window. */
export function addPeriods(periodLabel: string, count: number, granularity: Granularity): string {
  if (granularity === 'monthly') {
    const [y, m] = periodLabel.split('-').map(Number);
    const d = new Date(Date.UTC(y, m - 1 + count, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  const base = isoWeekLabelToDate(periodLabel);
  base.setUTCDate(base.getUTCDate() + count * 7);
  return getIsoWeekLabel(base);
}

/**
 * Real historical paid-invoice revenue for a workspace, grouped per currency
 * (no cross-currency summing/conversion — there is no exchange-rate source
 * anywhere in this app, and invoices.currency has a documented data-integrity
 * gap: the column default silently changed USD -> ZAR on 2026-08-18 with no
 * backfill, so mixed-currency history is a real possibility, not an edge case),
 * bucketed by the selected granularity (week or month).
 *
 * `rangeStart`/`rangeEnd` (ISO date strings) let the caller bound the query to
 * a custom date range instead of the default rolling lookback window — this
 * is what "custom range" means here: the SAME week/month bucketing, just over
 * whatever bounds the user picked, rather than a third bucketing algorithm.
 */
export async function getHistoricalRevenueByCurrency(
  workspaceId: string,
  granularity: Granularity,
  rangeStart?: string,
  rangeEnd?: string
): Promise<CurrencyRevenueSeries[]> {
  const supabase = createAdminClient();

  let start: Date;
  if (rangeStart) {
    start = new Date(rangeStart);
  } else {
    start = new Date();
    if (granularity === 'monthly') {
      start.setMonth(start.getMonth() - DEFAULT_LOOKBACK_PERIODS.monthly);
      start.setDate(1);
    } else {
      start.setDate(start.getDate() - DEFAULT_LOOKBACK_PERIODS.weekly * 7);
    }
  }
  start.setHours(0, 0, 0, 0);

  let query = supabase
    .from('invoices')
    .select('total_amount, currency, paid_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'paid')
    .not('paid_at', 'is', null)
    .gte('paid_at', start.toISOString())
    .order('paid_at', { ascending: true });

  if (rangeEnd) {
    const end = new Date(rangeEnd);
    end.setHours(23, 59, 59, 999);
    query = query.lte('paid_at', end.toISOString());
  }

  const { data, error } = await query;
  if (error) throw error;

  const byCurrency = new Map<string, Map<string, RevenuePeriodPoint>>();

  for (const inv of data ?? []) {
    const currency = (inv.currency || 'ZAR').toUpperCase();
    const period = getPeriodLabel(String(inv.paid_at), granularity);
    if (!byCurrency.has(currency)) byCurrency.set(currency, new Map());
    const periodMap = byCurrency.get(currency)!;
    const existing = periodMap.get(period) ?? { period, total: 0, invoiceCount: 0 };
    existing.total += Number(inv.total_amount ?? 0);
    existing.invoiceCount += 1;
    periodMap.set(period, existing);
  }

  return Array.from(byCurrency.entries())
    .map(([currency, periodMap]) => ({
      currency,
      periods: Array.from(periodMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
    }))
    .sort((a, b) => b.periods.length - a.periods.length);
}

/**
 * Plain-code trend math — deliberately NOT delegated to the LLM. The model
 * only reasons over these already-computed numbers.
 */
export function computeTrendStats(periods: RevenuePeriodPoint[]): TrendStats {
  const periodGrowthRates: number[] = [];
  for (let i = 1; i < periods.length; i++) {
    const prev = periods[i - 1].total;
    const curr = periods[i].total;
    const rate = prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    periodGrowthRates.push(Math.round(rate * 100) / 100);
  }

  const avgGrowthRate = periodGrowthRates.length
    ? Math.round((periodGrowthRates.reduce((s, r) => s + r, 0) / periodGrowthRates.length) * 100) / 100
    : 0;

  const movingAverage: { period: string; value: number }[] = [];
  const windowSize = Math.min(3, periods.length);
  if (windowSize > 0) {
    for (let i = windowSize - 1; i < periods.length; i++) {
      const window = periods.slice(i - windowSize + 1, i + 1);
      const avg = window.reduce((s, p) => s + p.total, 0) / windowSize;
      movingAverage.push({ period: periods[i].period, value: Math.round(avg * 100) / 100 });
    }
  }

  return {
    periodGrowthRates,
    avgGrowthRate,
    movingAverage,
    latestPeriodTotal: periods.length ? periods[periods.length - 1].total : 0,
  };
}

export function hasSufficientHistory(series: CurrencyRevenueSeries[], minPeriods: number = MIN_PERIODS_FOR_FORECAST): boolean {
  return series.some(s => s.periods.length >= minPeriods);
}

export { MIN_PERIODS_FOR_FORECAST, DEFAULT_LOOKBACK_PERIODS };
