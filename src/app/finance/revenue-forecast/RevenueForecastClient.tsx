'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { toast } from 'sonner';
import { Sparkles, TrendingUp, RefreshCw, AlertCircle, Clock, CalendarRange } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';
import { cn } from '@/lib/utils';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type Granularity = 'weekly' | 'monthly';

interface RevenuePeriodPoint {
  period: string;
  total: number;
  invoiceCount: number;
}

interface CurrencyRevenueSeries {
  currency: string;
  periods: RevenuePeriodPoint[];
}

interface ForecastPeriod {
  period: string;
  projectedTotal: number;
}

interface CurrencyForecast {
  currency: string;
  periods: ForecastPeriod[];
  reasoning: string;
}

interface ForecastRow {
  id: string;
  created_at: string;
  expires_at: string;
  forecast_result: {
    currencies: CurrencyForecast[];
    granularity: Granularity;
    horizonPeriods: number;
    rangeMode: 'default' | 'custom';
    rangeStart: string | null;
    rangeEnd: string | null;
  };
  tokens_used: number;
  model_used: string;
}

interface ForecastGetResponse {
  forecast: ForecastRow | null;
  forecastMatchesView: boolean;
  history: CurrencyRevenueSeries[];
  hasEnoughData: boolean;
  minPeriodsRequired: number;
  granularity: Granularity;
}

const HORIZON_OPTIONS: Record<Granularity, { value: number; label: string }[]> = {
  weekly: [
    { value: 1, label: '1 week' },
    { value: 2, label: '2 weeks' },
    { value: 4, label: '4 weeks' },
    { value: 12, label: '12 weeks' },
  ],
  monthly: [
    { value: 1, label: '1 month' },
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
  ],
};
const DEFAULT_HORIZON: Record<Granularity, number> = { weekly: 4, monthly: 3 };
const STORAGE_KEY = 'revenue-forecast-prefs';

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function loadPrefs(): { granularity: Granularity; horizonPeriods: number } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.granularity === 'weekly' || parsed?.granularity === 'monthly') return parsed;
    return null;
  } catch {
    return null;
  }
}

function savePrefs(granularity: Granularity, horizonPeriods: number) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ granularity, horizonPeriods }));
  } catch {
    // best-effort only
  }
}

export default function RevenueForecastClient() {
  const initialPrefs = useMemo(() => loadPrefs(), []);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [data, setData] = useState<ForecastGetResponse | null>(null);
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>(initialPrefs?.granularity ?? 'monthly');
  const [horizonPeriods, setHorizonPeriods] = useState<number>(initialPrefs?.horizonPeriods ?? DEFAULT_HORIZON.monthly);
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ granularity });
      if (useCustomRange && rangeStart) params.set('rangeStart', rangeStart);
      if (useCustomRange && rangeEnd) params.set('rangeEnd', rangeEnd);
      const res = await fetch(`/api/finance/revenue-forecast?${params.toString()}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load revenue forecast');
      setData(body);
      setActiveCurrency(prev => {
        if (prev && body.history?.some((s: CurrencyRevenueSeries) => s.currency === prev)) return prev;
        return body.history?.[0]?.currency ?? null;
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [granularity, useCustomRange, rangeStart, rangeEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleGranularityChange = (next: Granularity) => {
    setGranularity(next);
    const nextHorizon = DEFAULT_HORIZON[next];
    setHorizonPeriods(nextHorizon);
    savePrefs(next, nextHorizon);
  };

  const handleHorizonChange = (value: number) => {
    setHorizonPeriods(value);
    savePrefs(granularity, value);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/revenue-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          granularity,
          horizonPeriods,
          rangeStart: useCustomRange && rangeStart ? rangeStart : undefined,
          rangeEnd: useCustomRange && rangeEnd ? rangeEnd : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (res.status === 429 && body.retryAfterSeconds) {
          setCooldownSeconds(body.retryAfterSeconds);
        }
        throw new Error(body.error || 'Failed to generate forecast');
      }
      toast.success('New revenue forecast generated');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Failed to generate forecast');
    } finally {
      setGenerating(false);
    }
  };

  const currencySeries = useMemo(
    () => data?.history.find(s => s.currency === activeCurrency) ?? null,
    [data, activeCurrency]
  );

  const currencyForecast = useMemo(() => {
    if (!data?.forecastMatchesView) return null;
    return data?.forecast?.forecast_result?.currencies?.find(c => c.currency === activeCurrency) ?? null;
  }, [data, activeCurrency]);

  const chart = useMemo(() => {
    if (!currencySeries) return null;
    const historyPoints = currencySeries.periods;
    const projectedPoints = currencyForecast?.periods ?? [];

    const categories = [...historyPoints.map(p => p.period), ...projectedPoints.map(p => p.period)];
    const historicalData: (number | null)[] = [
      ...historyPoints.map(p => p.total),
      ...projectedPoints.map(() => null),
    ];
    const projectedData: (number | null)[] = [
      ...historyPoints.map((_, i) => (i === historyPoints.length - 1 ? historyPoints[i].total : null)),
      ...projectedPoints.map(p => p.projectedTotal),
    ];

    const options: ApexOptions = {
      chart: { type: 'line', height: 320, toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Inter, sans-serif' },
      colors: ['#2563EB', '#94A3B8'],
      stroke: { curve: 'smooth', width: [2.5, 2.5], dashArray: [0, 6] },
      markers: { size: 3, hover: { size: 5 } },
      grid: { show: true, borderColor: '#F1F5F9', strokeDashArray: 4 },
      xaxis: { categories, labels: { style: { colors: '#64748B', fontSize: '11px' }, rotate: granularity === 'weekly' ? -45 : 0 } },
      yaxis: { labels: { formatter: v => formatCurrency(Math.round(v || 0), currencySeries.currency), style: { colors: '#64748B', fontSize: '11px' } } },
      legend: { show: true, position: 'top', horizontalAlign: 'left' },
      tooltip: { theme: 'light', y: { formatter: v => (v == null ? 'N/A' : formatCurrency(v, currencySeries.currency)) } },
    };

    const series = [
      { name: 'Historical revenue', data: historicalData },
      { name: 'Projected revenue', data: projectedData },
    ];

    return { options, series };
  }, [currencySeries, currencyForecast, granularity]);

  const cooldownActive = cooldownSeconds !== null && cooldownSeconds > 0;
  const unitWord = granularity === 'weekly' ? 'weeks' : 'months';

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-64 rounded-lg bg-dash-surface animate-pulse motion-reduce:animate-none" />
        <div className="h-[360px] rounded-2xl bg-dash-surface animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-bold !text-dash-text flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-dash-accent" />
            Revenue <span className="text-dash-accent">Forecast</span>
          </h1>
          <p className="text-[12px] font-medium mt-1 !text-dash-textMuted">
            AI-assisted projections built on your real paid-invoice history — not a statistical model, just trend math plus reasoning.
          </p>
        </div>
        <DashButton onClick={handleGenerate} disabled={generating || cooldownActive || !data?.hasEnoughData}>
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Generating…
            </>
          ) : cooldownActive ? (
            <>
              <Clock className="w-4 h-4" /> Wait {Math.ceil((cooldownSeconds ?? 0) / 60)}m
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {data?.forecastMatchesView ? 'Regenerate forecast' : 'Generate forecast'}
            </>
          )}
        </DashButton>
      </div>

      <DashCard padding="default" interactive={false} className="space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wide block">View</span>
            <div className="flex gap-1.5">
              {(['weekly', 'monthly'] as Granularity[]).map(g => (
                <button
                  key={g}
                  onClick={() => handleGranularityChange(g)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors',
                    granularity === g
                      ? 'bg-dash-accent text-white border-dash-accent'
                      : 'bg-dash-surface !text-dash-textMuted border-dash-border hover:!text-dash-text'
                  )}
                >
                  {g === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wide block">Forecast horizon</span>
            <div className="flex gap-1.5">
              {HORIZON_OPTIONS[granularity].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleHorizonChange(opt.value)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-[12px] font-bold border transition-colors',
                    horizonPeriods === opt.value
                      ? 'bg-dash-accent/10 text-dash-accent border-dash-accent/30'
                      : 'bg-dash-surface !text-dash-textMuted border-dash-border hover:!text-dash-text'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wide block">&nbsp;</span>
            <button
              onClick={() => setUseCustomRange(v => !v)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors',
                useCustomRange
                  ? 'bg-dash-accent/10 text-dash-accent border-dash-accent/30'
                  : 'bg-dash-surface !text-dash-textMuted border-dash-border hover:!text-dash-text'
              )}
            >
              <CalendarRange className="w-3.5 h-3.5" /> Custom range
            </button>
          </div>
        </div>

        {useCustomRange && (
          <div className="flex items-center gap-3 flex-wrap pt-1">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wide block">From</span>
              <input
                type="date"
                value={rangeStart}
                onChange={e => setRangeStart(e.target.value)}
                className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold !text-dash-textMuted uppercase tracking-wide block">To</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={e => setRangeEnd(e.target.value)}
                className="h-9 rounded-lg border border-dash-border bg-white px-3 text-[12px] !text-dash-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent"
              />
            </div>
            <p className="text-[11px] !text-dash-textMuted pt-4">Leave blank to use the default lookback window.</p>
          </div>
        )}
      </DashCard>

      {error && (
        <div className="p-4 rounded-xl bg-red/10 border border-red/20 text-red text-[12px] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      {!data?.hasEnoughData ? (
        <DashCard padding="default" interactive={false} className="text-center py-16">
          <TrendingUp className="w-10 h-10 mx-auto text-dash-textMuted mb-3" />
          <h3 className="text-sm font-bold !text-dash-text mb-1">Not enough history yet</h3>
          <p className="text-[12px] !text-dash-textMuted max-w-md mx-auto">
            A {granularity} forecast needs at least {data?.minPeriodsRequired ?? 3} {unitWord} of paid invoices in the same currency.
            {granularity === 'weekly'
              ? ' Try switching to monthly view, or keep invoicing and check back once you have a few more weeks of history.'
              : ' Try switching to weekly view if you have recent invoices but less than 3 full months of history, or keep invoicing and check back later.'}
          </p>
        </DashCard>
      ) : (
        <>
          {data.history.length > 1 && (
            <div className="flex items-center gap-2">
              {data.history.map(s => (
                <button
                  key={s.currency}
                  onClick={() => setActiveCurrency(s.currency)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors',
                    activeCurrency === s.currency
                      ? 'bg-dash-accent text-white border-dash-accent'
                      : 'bg-dash-surface !text-dash-textMuted border-dash-border hover:!text-dash-text'
                  )}
                >
                  {s.currency}
                </button>
              ))}
            </div>
          )}

          <DashCard padding="default" interactive={false}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-bold !text-dash-text">
                {currencySeries?.currency} revenue — historical & projected ({granularity})
              </h3>
              {data.forecast && !data.forecastMatchesView && (
                <DashStatusPill variant="warning">
                  Latest forecast was {data.forecast.forecast_result.granularity} — regenerate for this view
                </DashStatusPill>
              )}
            </div>

            {!currencyForecast ? (
              <div className="py-12 text-center text-[12px] !text-dash-textMuted">
                No {granularity} forecast generated yet for {currencySeries?.currency}. Click "Generate forecast" above.
              </div>
            ) : chart ? (
              <Chart options={chart.options} series={chart.series} type="line" height={320} />
            ) : null}
          </DashCard>

          {currencyForecast?.reasoning && (
            <DashCard padding="default" interactive={false}>
              <div className="flex items-center gap-2 mb-3">
                <DashStatusPill variant="accent" dot>AI reasoning</DashStatusPill>
                {data.forecast && (
                  <span className="text-[11px] !text-dash-textMuted">
                    Generated {new Date(data.forecast.created_at).toLocaleString()}
                  </span>
                )}
              </div>
              <p className="text-[13px] !text-dash-text leading-relaxed">{currencyForecast.reasoning}</p>
            </DashCard>
          )}
        </>
      )}
    </div>
  );
}
