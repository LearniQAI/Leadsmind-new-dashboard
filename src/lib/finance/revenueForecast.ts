import { createAdminClient } from '@/lib/supabase/server';

export interface MonthlyRevenuePoint {
  /** YYYY-MM */
  month: string;
  total: number;
  invoiceCount: number;
}

export interface CurrencyRevenueSeries {
  currency: string;
  months: MonthlyRevenuePoint[];
}

export interface TrendStats {
  /** Month-over-month growth rate (%) between each consecutive pair of months. */
  momGrowthRates: number[];
  /** Average of momGrowthRates. */
  avgGrowthRate: number;
  /** 3-month simple moving average, one value per month once >=3 months are available. */
  movingAverage: { month: string; value: number }[];
  latestMonthTotal: number;
}

const HISTORY_MONTHS = 12;
const MIN_MONTHS_FOR_FORECAST = 3;

/**
 * Real historical paid-invoice revenue for a workspace, grouped per currency
 * (no cross-currency summing/conversion — there is no exchange-rate source
 * anywhere in this app, and invoices.currency has a documented data-integrity
 * gap: the column default silently changed USD -> ZAR on 2026-08-18 with no
 * backfill, so mixed-currency history is a real possibility, not an edge case).
 */
export async function getHistoricalRevenueByCurrency(workspaceId: string): Promise<CurrencyRevenueSeries[]> {
  const supabase = createAdminClient();

  const start = new Date();
  start.setMonth(start.getMonth() - HISTORY_MONTHS);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('invoices')
    .select('total_amount, currency, paid_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'paid')
    .not('paid_at', 'is', null)
    .gte('paid_at', start.toISOString())
    .order('paid_at', { ascending: true });

  if (error) throw error;

  const byCurrency = new Map<string, Map<string, MonthlyRevenuePoint>>();

  for (const inv of data ?? []) {
    const currency = (inv.currency || 'ZAR').toUpperCase();
    const month = String(inv.paid_at).slice(0, 7); // YYYY-MM
    if (!byCurrency.has(currency)) byCurrency.set(currency, new Map());
    const monthMap = byCurrency.get(currency)!;
    const existing = monthMap.get(month) ?? { month, total: 0, invoiceCount: 0 };
    existing.total += Number(inv.total_amount ?? 0);
    existing.invoiceCount += 1;
    monthMap.set(month, existing);
  }

  return Array.from(byCurrency.entries())
    .map(([currency, monthMap]) => ({
      currency,
      months: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
    }))
    .sort((a, b) => b.months.length - a.months.length);
}

/**
 * Plain-code trend math — deliberately NOT delegated to the LLM. The model
 * only reasons over these already-computed numbers.
 */
export function computeTrendStats(months: MonthlyRevenuePoint[]): TrendStats {
  const momGrowthRates: number[] = [];
  for (let i = 1; i < months.length; i++) {
    const prev = months[i - 1].total;
    const curr = months[i].total;
    const rate = prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
    momGrowthRates.push(Math.round(rate * 100) / 100);
  }

  const avgGrowthRate = momGrowthRates.length
    ? Math.round((momGrowthRates.reduce((s, r) => s + r, 0) / momGrowthRates.length) * 100) / 100
    : 0;

  const movingAverage: { month: string; value: number }[] = [];
  const windowSize = 3;
  for (let i = windowSize - 1; i < months.length; i++) {
    const window = months.slice(i - windowSize + 1, i + 1);
    const avg = window.reduce((s, m) => s + m.total, 0) / windowSize;
    movingAverage.push({ month: months[i].month, value: Math.round(avg * 100) / 100 });
  }

  return {
    momGrowthRates,
    avgGrowthRate,
    movingAverage,
    latestMonthTotal: months.length ? months[months.length - 1].total : 0,
  };
}

export function hasSufficientHistory(series: CurrencyRevenueSeries[]): boolean {
  return series.some(s => s.months.length >= MIN_MONTHS_FOR_FORECAST);
}

export { MIN_MONTHS_FOR_FORECAST, HISTORY_MONTHS };
