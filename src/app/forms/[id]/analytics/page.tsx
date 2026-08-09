'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ApexOptions } from 'apexcharts';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, MousePointerClick, TrendingUp, AlertTriangle, Clock, SplitSquareHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashCard } from '@/components/dashboard-ui/Card';
import { getFormAnalyticsData } from '@/app/actions/marketing';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface AnalyticsData {
  form: { id: string; name: string };
  range: { days: number };
  kpis: { views: number; uniqueVisitors: number; submissions: number; conversionRate: number };
  timeSeries: { date: string; views: number; submissions: number }[];
  fieldDropoff: { fieldId: string; fieldName: string; focused: number; completed: number; dropoffRate: number; avgTimeSeconds: number | null }[];
  avgCompletionSeconds: number | null;
}

function formatDuration(seconds: number | null) {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function FormAnalyticsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const res = await getFormAnalyticsData(params.id, days);
      if (cancelled) return;
      if ('error' in res && res.error) {
        setError(res.error);
      } else {
        setData((res as any).data);
        setError(null);
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [params.id, days]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-white p-8 flex items-center justify-center">
        <p className="text-sm !text-dash-textMuted">{error || 'Failed to load analytics.'}</p>
      </div>
    );
  }

  const { kpis, timeSeries, fieldDropoff, avgCompletionSeconds } = data;

  const chartOptions: ApexOptions = {
    chart: { type: 'area', height: 320, toolbar: { show: false }, zoom: { enabled: false } },
    colors: ['#2563eb', '#22c55e'],
    fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 2 },
    grid: { show: true, borderColor: '#E6E6E6' },
    xaxis: {
      categories: timeSeries.map(d => d.date.slice(5)),
      labels: { style: { colors: '#7A7A7A', fontSize: '11px' } },
    },
    yaxis: { labels: { style: { colors: '#7A7A7A', fontSize: '11px' } } },
    legend: { show: true, position: 'top', horizontalAlign: 'right' },
    tooltip: { x: { show: true } },
  };
  const chartSeries = [
    { name: 'Views', data: timeSeries.map(d => d.views) },
    { name: 'Submissions', data: timeSeries.map(d => d.submissions) },
  ];

  return (
    <div className="min-h-screen bg-white !text-dash-text p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/forms')}
              className="p-2 bg-dash-surface hover:bg-dash-border/60 rounded-xl transition-colors motion-reduce:transition-none"
            >
              <ArrowLeft size={18} className="!text-dash-textMuted" />
            </button>
            <div>
              <h1 className="text-2xl font-bold !text-dash-text">
                {data.form?.name} analytics
              </h1>
              <p className="text-sm !text-dash-textMuted">Real-time conversion intelligence</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/forms/${params.id}/ab-testing`)}
              className="flex items-center gap-2 px-4 py-2 bg-dash-surface hover:bg-dash-border/60 border border-dash-border rounded-xl text-xs font-bold !text-dash-textMuted transition-colors motion-reduce:transition-none"
            >
              <SplitSquareHorizontal size={14} /> A/B testing
            </button>
            {[7, 30, 90].map(d => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={cn(
                  "px-4 py-2 border rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none",
                  days === d ? "bg-dash-accent text-white border-dash-accent" : "bg-dash-surface hover:bg-dash-border/60 border-dash-border !text-dash-textMuted"
                )}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total views', value: kpis.views.toLocaleString(), icon: <Users size={18} className="text-dash-accent" /> },
            { label: 'Unique visitors', value: kpis.uniqueVisitors.toLocaleString(), icon: <Users size={18} className="text-purple-600" /> },
            { label: 'Submissions', value: kpis.submissions.toLocaleString(), icon: <MousePointerClick size={18} className="text-green" /> },
            { label: 'Conversion rate', value: `${kpis.conversionRate}%`, icon: <TrendingUp size={18} className="text-red" /> },
            { label: 'Avg. completion time', value: formatDuration(avgCompletionSeconds), icon: <Clock size={18} className="text-amber-600" /> },
          ].map((kpi, i) => (
            <DashCard key={i} padding="default">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-dash-surface rounded-lg">{kpi.icon}</div>
                <span className="text-[10px] font-bold !text-dash-textMuted">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold !text-dash-text">{kpi.value}</p>
            </DashCard>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          <DashCard padding="default" className="lg:col-span-2 h-[400px] flex flex-col">
            <h3 className="text-[11px] font-bold !text-dash-textMuted mb-6">Views &amp; submissions over time</h3>
            {timeSeries.some(d => d.views > 0 || d.submissions > 0) ? (
              <Chart options={chartOptions} series={chartSeries} type="area" height={320} />
            ) : (
              <div className="flex-1 border border-dash-border border-dashed rounded-xl flex items-center justify-center bg-dash-surface">
                <p className="text-xs !text-dash-textMuted">No views recorded in this range yet.</p>
              </div>
            )}
          </DashCard>

          {/* Field Level Insights */}
          <DashCard padding="default" className="flex flex-col">
            <h3 className="text-[11px] font-bold !text-dash-textMuted mb-6 flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600" />
              Field drop-off warnings
            </h3>

            {fieldDropoff.length === 0 ? (
              <p className="text-xs !text-dash-textMuted">Not enough field interaction data yet to surface drop-off.</p>
            ) : (
              <div className="space-y-4">
                {fieldDropoff.map((field) => {
                  const status = field.dropoffRate >= 30 ? 'critical' : field.dropoffRate >= 15 ? 'warning' : 'stable';
                  return (
                    <div key={field.fieldId} className={cn(
                      "p-4 rounded-xl border",
                      status === 'critical' ? 'bg-red/5 border-red/20' :
                      status === 'warning' ? 'bg-amber-50 border-amber-200' :
                      'bg-dash-surface border-dash-border'
                    )}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-bold !text-dash-text">{field.fieldName}</span>
                        <span className={cn(
                          "text-[10px] font-bold px-2 py-1 rounded",
                          status === 'critical' ? 'bg-red/10 text-red' :
                          status === 'warning' ? 'bg-amber-100 text-amber-600' :
                          'bg-green/10 text-green'
                        )}>
                          {status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="!text-dash-textMuted">Drop-off: <strong className="!text-dash-text">{field.dropoffRate}%</strong></span>
                        <span className="!text-dash-textMuted">Avg time: <strong className="!text-dash-text">{field.avgTimeSeconds !== null ? `${field.avgTimeSeconds}s` : '—'}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>

        </div>
      </div>
    </div>
  );
}
