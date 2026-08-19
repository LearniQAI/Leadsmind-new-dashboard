'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { toast } from 'sonner';
import { Sparkles, TrendingUp, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface MonthlyRevenuePoint {
  month: string;
  total: number;
  invoiceCount: number;
}

interface CurrencyRevenueSeries {
  currency: string;
  months: MonthlyRevenuePoint[];
}

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

interface ForecastRow {
  id: string;
  created_at: string;
  expires_at: string;
  forecast_result: { currencies: CurrencyForecast[] };
  tokens_used: number;
  model_used: string;
}

interface ForecastGetResponse {
  forecast: ForecastRow | null;
  history: CurrencyRevenueSeries[];
  hasEnoughData: boolean;
  minMonthsRequired: number;
}

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-ZA', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

export default function RevenueForecastClient() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState<number | null>(null);
  const [data, setData] = useState<ForecastGetResponse | null>(null);
  const [activeCurrency, setActiveCurrency] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<'next1Month' | 'next3Months' | 'next6Months'>('next3Months');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/revenue-forecast');
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Failed to load revenue forecast');
      setData(body);
      if (body.history?.length && !activeCurrency) {
        setActiveCurrency(body.history[0].currency);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [activeCurrency]);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (cooldownSeconds === null || cooldownSeconds <= 0) return;
    const t = setTimeout(() => setCooldownSeconds(s => (s !== null ? s - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [cooldownSeconds]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/revenue-forecast', { method: 'POST' });
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

  const currencyForecast = useMemo(
    () => data?.forecast?.forecast_result?.currencies?.find(c => c.currency === activeCurrency) ?? null,
    [data, activeCurrency]
  );

  const chart = useMemo(() => {
    if (!currencySeries) return null;
    const historyPoints = currencySeries.months;
    const projectedPoints = currencyForecast?.[horizon] ?? [];

    const categories = [...historyPoints.map(p => p.month), ...projectedPoints.map(p => p.month)];
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
      xaxis: { categories, labels: { style: { colors: '#64748B', fontSize: '11px' } } },
      yaxis: { labels: { formatter: v => formatCurrency(Math.round(v || 0), currencySeries.currency), style: { colors: '#64748B', fontSize: '11px' } } },
      legend: { show: true, position: 'top', horizontalAlign: 'left' },
      tooltip: { theme: 'light', y: { formatter: v => (v == null ? 'N/A' : formatCurrency(v, currencySeries.currency)) } },
    };

    const series = [
      { name: 'Historical revenue', data: historicalData },
      { name: 'Projected revenue', data: projectedData },
    ];

    return { options, series };
  }, [currencySeries, currencyForecast, horizon]);

  if (loading) {
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
        <DashButton onClick={handleGenerate} disabled={generating || (cooldownSeconds !== null && cooldownSeconds > 0) || !data?.hasEnoughData}>
          {generating ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin motion-reduce:animate-none" /> Generating…
            </>
          ) : cooldownSeconds !== null && cooldownSeconds > 0 ? (
            <>
              <Clock className="w-4 h-4" /> Wait {Math.ceil(cooldownSeconds / 60)}m
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> {data?.forecast ? 'Regenerate forecast' : 'Generate forecast'}
            </>
          )}
        </DashButton>
      </div>

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
            A forecast needs at least {data?.minMonthsRequired ?? 3} months of paid invoices in the same currency.
            Keep invoicing clients and this page will unlock automatically once you have enough data.
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
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold border transition-colors ${
                    activeCurrency === s.currency
                      ? 'bg-dash-accent text-white border-dash-accent'
                      : 'bg-dash-surface !text-dash-textMuted border-dash-border hover:!text-dash-text'
                  }`}
                >
                  {s.currency}
                </button>
              ))}
            </div>
          )}

          <DashCard padding="default" interactive={false}>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <h3 className="text-sm font-bold !text-dash-text">
                {currencySeries?.currency} revenue — historical & projected
              </h3>
              <div className="flex items-center gap-1.5">
                {(['next1Month', 'next3Months', 'next6Months'] as const).map(h => (
                  <button
                    key={h}
                    onClick={() => setHorizon(h)}
                    disabled={!currencyForecast}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-colors disabled:opacity-40 ${
                      horizon === h ? 'bg-dash-accent/10 text-dash-accent' : '!text-dash-textMuted hover:!text-dash-text'
                    }`}
                  >
                    {h === 'next1Month' ? '1 month' : h === 'next3Months' ? '3 months' : '6 months'}
                  </button>
                ))}
              </div>
            </div>

            {!currencyForecast ? (
              <div className="py-12 text-center text-[12px] !text-dash-textMuted">
                No forecast generated yet for {currencySeries?.currency}. Click "Generate forecast" above.
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
