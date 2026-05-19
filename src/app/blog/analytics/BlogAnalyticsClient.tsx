'use client';

import React from 'react';
import { BarChart3, Users, Clock, ArrowUpRight, Globe, MousePointerClick, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

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
    label: 'Total Impressions',
    icon: BarChart3,
    color: 'text-primary',
    glow: 'hover:border-primary/30',
    suffix: '',
    badge: { text: 'Live', color: 'text-emerald-400' }
  },
  {
    key: 'uniqueVisitors' as const,
    label: 'Unique Readers',
    icon: Users,
    color: 'text-purple-400',
    glow: 'hover:border-purple-500/30',
    suffix: ''
  },
  {
    key: 'avgTime' as const,
    label: 'Avg. Time on Page',
    icon: Clock,
    color: 'text-amber-400',
    glow: 'hover:border-amber-500/30',
    suffix: 's'
  },
  {
    key: 'avgScroll' as const,
    label: 'Avg. Scroll Depth',
    icon: MousePointerClick,
    color: 'text-emerald-400',
    glow: 'hover:border-emerald-500/30',
    suffix: '%'
  },
];

export default function BlogAnalyticsClient({ stats, topPosts, channels }: AnalyticsProps) {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--n900)]">

      {/* Page Header — matches platform pattern */}
      <div className="page-header px-8 py-6 flex-shrink-0 bg-[var(--n900)] border-b border-white/5">
        <div className="ph-left">
          <div className="flex items-center gap-3.5 mb-1">
            <Link href="/blog/manage" className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all duration-200">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-space-grotesk text-white uppercase tracking-tight flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-primary shrink-0" />
              Insights <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Analytics</span>
            </h1>
          </div>
          <p className="text-xs font-medium text-white/50 tracking-wide mt-1.5 ml-14">
            Content performance, reader engagement &amp; acquisition pipeline
          </p>
        </div>
        <div className="ph-right">
          <Link
            href="/blog/comments"
            className="btn-outline !h-10 !px-5 text-xs font-bold uppercase tracking-widest gap-2 rounded-xl"
          >
            Moderation
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-8 sm:p-10 space-y-8">

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {KPI_CARDS.map(({ key, label, icon: Icon, color, glow, suffix, badge }) => (
            <div
              key={key}
              className={`bg-[#080f28] p-6 rounded-2xl shadow-xl border border-white/5 relative overflow-hidden group transition-all duration-300 ${glow}`}
            >
              <div className="absolute -bottom-4 -right-4 opacity-[0.05] group-hover:opacity-[0.12] transition-opacity duration-300 pointer-events-none">
                <Icon className={`w-24 h-24 ${color}`} />
              </div>
              <span className="text-xs text-white/40 font-bold uppercase tracking-widest block mb-3">{label}</span>
              <div className="flex items-end gap-2.5">
                <span className="text-3xl sm:text-4xl font-space-grotesk font-extrabold text-white leading-none">
                  {stats[key]}{suffix}
                </span>
                {badge && (
                  <span className={`text-[10px] ${badge.color} font-bold mb-1 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20`}>
                    <ArrowUpRight className="w-3 h-3" />{badge.text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Top Articles */}
          <div className="lg:col-span-2 bg-[#080f28] border border-white/5 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
              <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0" />
              <h2 className="text-base font-bold text-white tracking-wide">Top Performing Articles</h2>
            </div>

            <div className="flex-1 divide-y divide-white/[0.04]">
              {topPosts.length > 0 ? topPosts.slice(0, 6).map((post, idx) => (
                <div key={post.id} className="flex items-center gap-4 px-6 py-5 hover:bg-white/[0.02] transition group">
                  <span className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-xs font-black text-white/30 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-white group-hover:text-primary transition truncate">
                      <Link href={`/blog/${post.slug}`} target="_blank">{post.title}</Link>
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-xs text-white/50 font-medium">{post.views} views</span>
                      <span className="w-px h-3 bg-white/10" />
                      <span className="text-xs text-white/50 font-medium">{post.scroll}% depth</span>
                      <span className="w-px h-3 bg-white/10" />
                      <span className="text-xs text-white/50 font-medium">{post.unique} unique readers</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-space-grotesk font-extrabold text-white">{post.time}s</div>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">avg time</span>
                  </div>
                  {/* Visual scroll depth bar */}
                  <div className="w-20 h-2 bg-white/5 rounded-full overflow-hidden shrink-0 hidden sm:block">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${post.scroll}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-24 text-center px-6">
                  <BarChart3 className="w-12 h-12 text-white/10 mb-4 animate-pulse" />
                  <p className="text-sm text-white/40 font-bold uppercase tracking-wider">No analytics data recorded yet.</p>
                  <p className="text-xs text-white/20 mt-1.5 max-w-sm leading-relaxed">
                    Once readers start visiting and reading your published articles, real-time tracking metrics will populate here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-[#080f28] border border-white/5 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center gap-2.5 px-6 py-5 border-b border-white/5">
              <Globe className="w-5 h-5 text-blue-400 shrink-0" />
              <h2 className="text-base font-bold text-white tracking-wide">Traffic Sources</h2>
            </div>

            <div className="flex-1 p-6 space-y-6">
              {channels.length > 0 ? channels.map((c, idx) => {
                const max = channels[0].count;
                const pct = Math.round((c.count / max) * 100);
                const gradients = [
                  'from-blue-500 to-cyan-400',
                  'from-purple-500 to-violet-400',
                  'from-emerald-500 to-teal-400',
                  'from-amber-500 to-orange-400',
                  'from-rose-500 to-pink-400',
                ];
                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-white/80 truncate max-w-[160px]">{c.name}</span>
                      <span className="text-xs text-white/50 font-bold tabular-nums">{c.count} views</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${gradients[idx % gradients.length]} h-full rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                  <Globe className="w-10 h-10 text-white/10 mb-4" />
                  <p className="text-sm text-white/35 font-bold uppercase tracking-wider">No traffic data yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
