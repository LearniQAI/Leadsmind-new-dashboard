'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { ApexOptions } from 'apexcharts';
import { ChartLine, Loader2 } from 'lucide-react';
import { Facebook, Instagram, YouTube } from '@/components/icons/BrandIcons';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashEmptyState } from '@/components/dashboard-ui/EmptyState';
import { DashTabs, DashTabsList, DashTabsTrigger, DashTabsContent } from '@/components/dashboard-ui/Tabs';
import { getSocialEngagementAnalytics } from '@/app/actions/socialAnalytics';

const Chart = dynamic(() => import('react-apexcharts'), { ssr: false });

type MetricRow = {
 platform: string;
 platform_post_id: string;
 metric_type: string;
 metric_date: string;
 value: number;
 fetched_at: string;
};

// Only these three platforms have a real Insights/Analytics API at our current app tier (Task
// 94 audit) — LinkedIn needs Marketing Developer Platform partner access and TikTok's public
// API has no analytics endpoints at any tier. Neither gets a tab; showing one disabled would
// imply a future toggle that doesn't exist.
const PLATFORM_META: Record<string, { label: string; icon: React.ElementType; metrics: { key: string; label: string }[]; cumulative: boolean }> = {
 facebook: {
  label: 'Facebook',
  icon: Facebook,
  cumulative: false, // Page Insights returns a lifetime snapshot per poll, not a per-day delta
  metrics: [
   { key: 'post_clicks', label: 'Clicks' },
   { key: 'post_reactions_like_total', label: 'Likes' },
   { key: 'post_video_views', label: 'Video views' },
  ],
 },
 instagram: {
  label: 'Instagram',
  icon: Instagram,
  cumulative: false,
  metrics: [
   { key: 'reach', label: 'Reach' },
   { key: 'saved', label: 'Saves' },
   { key: 'likes', label: 'Likes' },
   { key: 'comments', label: 'Comments' },
   { key: 'shares', label: 'Shares' },
  ],
 },
 youtube: {
  label: 'YouTube',
  icon: YouTube,
  cumulative: true, // YouTube Analytics returns a real per-day delta, so days sum to a total
  metrics: [
   { key: 'views', label: 'Views' },
   { key: 'likes', label: 'Likes' },
   { key: 'comments', label: 'Comments' },
   { key: 'shares', label: 'Shares' },
   { key: 'estimatedMinutesWatched', label: 'Watch time (min)' },
   { key: 'subscribersGained', label: 'Subscribers gained' },
  ],
 },
};

const PLATFORM_ORDER = ['facebook', 'instagram', 'youtube'];

function timeAgo(iso: string | null): string {
 if (!iso) return 'never';
 const diffMs = Date.now() - new Date(iso).getTime();
 const mins = Math.floor(diffMs / 60000);
 if (mins < 1) return 'just now';
 if (mins < 60) return `${mins}m ago`;
 const hrs = Math.floor(mins / 60);
 if (hrs < 24) return `${hrs}h ago`;
 return `${Math.floor(hrs / 24)}d ago`;
}

function PlatformPanel({ platform, rows }: { platform: string; rows: MetricRow[] }) {
 const meta = PLATFORM_META[platform];
 const platformRows = useMemo(() => rows.filter((r) => r.platform === platform), [rows, platform]);

 if (platformRows.length === 0) {
  return (
   <DashCard padding="default">
    <DashEmptyState
     icon={meta.icon}
     title="No analytics yet"
     description={`No engagement data has been ingested for ${meta.label} yet. This appears once a published post is polled by the analytics worker.`}
     compact
    />
   </DashCard>
  );
 }

 const dates = Array.from(new Set(platformRows.map((r) => r.metric_date))).sort();

 const totals = meta.metrics.map(({ key, label }) => {
  const metricRows = platformRows.filter((r) => r.metric_type === key);
  if (metricRows.length === 0) return { key, label, value: null as number | null };
  const value = meta.cumulative
   ? metricRows.reduce((sum, r) => sum + r.value, 0)
   : metricRows.reduce((latest, r) => (r.metric_date >= latest.metric_date ? r : latest), metricRows[0]).value;
  return { key, label, value };
 });

 const series = meta.metrics
  .filter(({ key }) => platformRows.some((r) => r.metric_type === key))
  .map(({ key, label }) => ({
   name: label,
   data: dates.map((d) => platformRows.filter((r) => r.metric_type === key && r.metric_date === d).reduce((s, r) => s + r.value, 0)),
  }));

 const chartOptions: ApexOptions = {
  chart: { type: 'area', height: 300, toolbar: { show: false }, zoom: { enabled: false } },
  colors: ['#2563eb', '#22c55e', '#f59e0b', '#a855f7', '#ef4444', '#0ea5e9'],
  fill: { type: 'gradient', gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
  dataLabels: { enabled: false },
  stroke: { curve: 'smooth', width: 2 },
  grid: { show: true, borderColor: '#E6E6E6' },
  xaxis: { categories: dates, labels: { style: { colors: '#7A7A7A', fontSize: '11px' } } },
  yaxis: { labels: { style: { colors: '#7A7A7A', fontSize: '11px' } } },
  legend: { show: true, position: 'top', horizontalAlign: 'right' },
  tooltip: { x: { show: true } },
 };

 return (
  <div className="space-y-4">
   <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    {totals.map(({ key, label, value }) => (
     <DashCard key={key} padding="default" interactive={false}>
      <p className="!text-dash-textMuted text-[11px] font-semibold uppercase tracking-wide">{label}</p>
      <p className="!text-dash-text text-2xl font-bold mt-1">{value === null ? '—' : value.toLocaleString()}</p>
     </DashCard>
    ))}
   </div>

   <DashCard padding="default" interactive={false}>
    <p className="!text-dash-textMuted text-[11px] font-semibold uppercase tracking-wide mb-2">Trend by day</p>
    {dates.length > 1 ? (
     <Chart options={chartOptions} series={series} type="area" height={300} />
    ) : (
     <p className="!text-dash-textMuted text-[12px] py-8 text-center">
      Only one data point so far ({dates[0]}). A trend line appears once the analytics worker has polled this platform across multiple days.
     </p>
    )}
   </DashCard>
  </div>
 );
}

export default function SocialAnalyticsClient() {
 const [loading, setLoading] = useState(true);
 const [rows, setRows] = useState<MetricRow[]>([]);
 const [connected, setConnected] = useState<string[]>([]);
 const [lastUpdated, setLastUpdated] = useState<string | null>(null);
 const [tab, setTab] = useState<string>(PLATFORM_ORDER[0]);

 useEffect(() => {
  let cancelled = false;
  (async () => {
   setLoading(true);
   const res = await getSocialEngagementAnalytics();
   if (cancelled) return;
   setRows((res.data || []) as MetricRow[]);
   setConnected(res.connectedPlatforms || []);
   setLastUpdated(res.lastUpdated || null);
   setLoading(false);
  })();
  return () => {
   cancelled = true;
  };
 }, []);

 if (loading) {
  return (
   <DashCard padding="default">
    <div className="flex items-center justify-center gap-2 py-10 !text-dash-textMuted text-[13px]">
     <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
    </div>
   </DashCard>
  );
 }

 const hasAnyData = rows.length > 0;

 return (
  <div className="space-y-4">
   <div className="flex items-center justify-between flex-wrap gap-2">
    <h1 className="text-3xl font-bold !text-dash-text">
     Social <span className="text-dash-accent">analytics</span>
    </h1>
    <p className="!text-dash-textMuted text-[11px] font-medium">
     Last updated {timeAgo(lastUpdated)} — polled, not real-time.
    </p>
   </div>
   <p className="!text-dash-textMuted text-[12px] font-medium -mt-2">
    Engagement analytics for Facebook, Instagram, and YouTube — the only platforms with a real Insights/Analytics API at our current app tier.
   </p>

   {!hasAnyData ? (
    <DashCard padding="default">
     <DashEmptyState
      icon={ChartLine}
      title="No analytics ingested yet"
      description={
       connected.length === 0
        ? 'Connect Facebook, Instagram, or YouTube to start collecting engagement analytics on published posts.'
        : 'Connected, but no metrics have been polled yet. This fills in automatically once the analytics worker syncs your published posts.'
      }
      actionLabel={connected.length === 0 ? 'Go to connections' : undefined}
      actionHref={connected.length === 0 ? '/social/connections' : undefined}
     />
    </DashCard>
   ) : (
    <DashTabs value={tab} onValueChange={setTab}>
     <DashTabsList>
      {PLATFORM_ORDER.map((p) => {
       const Icon = PLATFORM_META[p].icon;
       return (
        <DashTabsTrigger key={p} value={p} className="flex items-center gap-1.5">
         <Icon className="w-3.5 h-3.5" /> {PLATFORM_META[p].label}
        </DashTabsTrigger>
       );
      })}
     </DashTabsList>
     {PLATFORM_ORDER.map((p) => (
      <DashTabsContent key={p} value={p}>
       <PlatformPanel platform={p} rows={rows} />
      </DashTabsContent>
     ))}
    </DashTabs>
   )}
  </div>
 );
}
