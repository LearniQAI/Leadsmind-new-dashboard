'use client';

import React from 'react';
import { BarChart3, Users, Clock, ArrowUpRight, Globe, MousePointerClick, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';

interface PostStat {
  id: string;
  title: string;
  slug: string;
  views: number;
  unique: number;
  time: number;
  scroll: number;
}

interface AnalyticsProps {
  stats: { totalViews: number; uniqueVisitors: number; avgTime: number; avgScroll: number; };
  topPosts: PostStat[];
  channels: { name: string; count: number }[];
}

const KPI_CARDS = [
  {
    key: 'totalViews' as const,
    label: 'Total impressions',
    icon: BarChart3,
    color: 'text-dash-accent',
    suffix: '',
    badge: { text: 'Live', color: 'text-green' }
  },
  {
    key: 'uniqueVisitors' as const,
    label: 'Unique readers',
    icon: Users,
    color: 'text-purple-600',
    suffix: ''
  },
  {
    key: 'avgTime' as const,
    label: 'Avg. time on page',
    icon: Clock,
    color: 'text-amber-600',
    suffix: 's'
  },
  {
    key: 'avgScroll' as const,
    label: 'Avg. scroll depth',
    icon: MousePointerClick,
    color: 'text-green',
    suffix: '%'
  },
];

export default function BlogAnalyticsClient({ stats, topPosts, channels }: AnalyticsProps) {
  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* Page Header */}
      <div className="px-8 py-6 flex-shrink-0 bg-white border-b border-dash-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3.5 mb-1">
            <Link href="/blog/manage" className="p-2.5 rounded-xl bg-dash-surface hover:bg-dash-border/60 !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold !text-dash-text flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-dash-accent shrink-0" />
              Insights <span className="text-dash-accent">analytics</span>
            </h1>
          </div>
          <p className="text-xs font-medium !text-dash-textMuted mt-1.5 ml-14">
            Content performance, reader engagement &amp; acquisition pipeline
          </p>
        </div>
        <DashButton asChild variant="secondary">
          <Link href="/blog/comments">
            Moderation
          </Link>
        </DashButton>
      </div>

      {/* Body */}
      <div className="flex-1 p-8 sm:p-10 space-y-8">

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {KPI_CARDS.map(({ key, label, icon: Icon, color, suffix, badge }) => (
            <DashCard key={key} padding="default" className="relative overflow-hidden group">
              <div className="absolute -bottom-4 -right-4 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-300 motion-reduce:transition-none pointer-events-none">
                <Icon className={`w-24 h-24 ${color}`} />
              </div>
              <span className="text-xs !text-dash-textMuted font-bold block mb-3">{label}</span>
              <div className="flex items-end gap-2.5">
                <span className="text-3xl sm:text-4xl font-bold !text-dash-text leading-none">
                  {stats[key]}{suffix}
                </span>
                {badge && (
                  <span className={`text-[10px] ${badge.color} font-bold mb-1 flex items-center gap-1 bg-green/10 px-2 py-0.5 rounded-full border border-green/20`}>
                    <ArrowUpRight className="w-3 h-3" />{badge.text}
                  </span>
                )}
              </div>
            </DashCard>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Top Articles */}
          <DashCard padding="none" className="lg:col-span-2 flex flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-dash-border">
              <TrendingUp className="w-5 h-5 text-green shrink-0" />
              <h2 className="text-base font-bold !text-dash-text">Top performing articles</h2>
            </div>

            <div className="flex-1 divide-y divide-dash-border">
              {topPosts.length > 0 ? topPosts.slice(0, 6).map((post, idx) => (
                <div key={post.id} className="flex items-center gap-4 px-6 py-5 hover:bg-dash-surface transition-colors motion-reduce:transition-none group">
                  <span className="w-7 h-7 rounded-lg bg-dash-surface flex items-center justify-center text-xs font-bold !text-dash-textMuted shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none truncate">
                      <Link href={`/blog/${post.slug}`} target="_blank">{post.title}</Link>
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs !text-dash-textMuted font-medium">{post.views} views</span>
                      <span className="w-px h-3 bg-dash-border" />
                      <span className="text-xs !text-dash-textMuted font-medium">{post.scroll}% depth</span>
                      <span className="w-px h-3 bg-dash-border" />
                      <span className="text-xs !text-dash-textMuted font-medium">{post.unique} unique readers</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-bold !text-dash-text">{post.time}s</div>
                    <span className="text-[10px] !text-dash-textMuted font-semibold">avg time</span>
                  </div>
                  {/* Visual scroll depth bar */}
                  <div className="w-20 h-2 bg-dash-surface rounded-full overflow-hidden shrink-0 hidden sm:block">
                    <div
                      className="h-full rounded-full bg-dash-accent"
                      style={{ width: `${post.scroll}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                  <BarChart3 className="w-12 h-12 !text-dash-textMuted opacity-30 mb-4" />
                  <p className="text-sm !text-dash-textMuted font-bold">No analytics data recorded yet.</p>
                  <p className="text-xs !text-dash-textMuted opacity-70 mt-1.5 max-w-sm leading-relaxed">
                    Once readers start visiting and reading your published articles, real-time tracking metrics will populate here.
                  </p>
                </div>
              )}
            </div>
          </DashCard>

          {/* Traffic Sources */}
          <DashCard padding="none" className="flex flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-dash-border">
              <Globe className="w-5 h-5 text-dash-accent shrink-0" />
              <h2 className="text-base font-bold !text-dash-text">Traffic sources</h2>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {channels.length > 0 ? channels.map((c, idx) => {
                const max = channels[0].count;
                const pct = Math.round((c.count / max) * 100);
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold !text-dash-text truncate max-w-[160px]">{c.name}</span>
                      <span className="text-xs !text-dash-textMuted font-bold tabular-nums">{c.count} views</span>
                    </div>
                    <div className="w-full bg-dash-surface rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-dash-accent h-full rounded-full transition-all duration-500 motion-reduce:transition-none"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <Globe className="w-10 h-10 !text-dash-textMuted opacity-30 mb-4" />
                  <p className="text-sm !text-dash-textMuted font-bold">No traffic data yet.</p>
                </div>
              )}
            </div>
          </DashCard>

        </div>
      </div>
    </div>
  );
}
