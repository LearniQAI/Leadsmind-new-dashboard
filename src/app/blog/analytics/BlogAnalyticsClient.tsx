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
      <div className="page-header px-6 py-5 flex-shrink-0 bg-[var(--n900)] border-b border-white/5">
        <div className="ph-left">
          <div className="flex items-center gap-2 mb-0.5">
            <Link href="/blog/manage" className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition">
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
            <h1 className="text-2xl font-black font-space-grotesk text-white uppercase tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-6 h-6 text-primary shrink-0" />
              Insights <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Analytics</span>
            </h1>
          </div>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-semibold mt-1 ml-10">
            Content performance, reader engagement &amp; acquisition pipeline
          </p>
        </div>
        <div className="ph-right">
          <Link
            href="/blog/comments"
            className="btn-outline !h-9 !px-4 text-[10px] font-bold uppercase tracking-widest gap-1.5"
          >
            Moderation
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {KPI_CARDS.map(({ key, label, icon: Icon, color, glow, suffix, badge }) => (
            <div
              key={key}
              className={`bg-[#080f28] p-4 rounded-xl shadow-lg relative overflow-hidden group transition-all ${glow}`}
            >
              <div className="absolute -bottom-3 -right-3 opacity-[0.07] group-hover:opacity-[0.13] transition-opacity pointer-events-none">
                <Icon className={`w-20 h-20 ${color}`} />
              </div>
              <span className="text-[9px] text-white/40 font-bold uppercase tracking-widest block mb-2">{label}</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-space-grotesk font-black text-white leading-none">
                  {stats[key]}{suffix}
                </span>
                {badge && (
                  <span className={`text-[9px] ${badge.color} font-bold mb-0.5 flex items-center gap-0.5`}>
                    <ArrowUpRight className="w-2.5 h-2.5" />{badge.text}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Main Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Top Articles */}
          <div className="lg:col-span-2 bg-[#080f28] rounded-xl shadow-xl flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
              <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
              <h2 className="text-sm font-bold text-white tracking-wide">Top Performing Articles</h2>
            </div>

            <div className="flex-1 divide-y divide-white/[0.04]">
              {topPosts.length > 0 ? topPosts.slice(0, 6).map((post, idx) => (
                <div key={post.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition group">
                  <span className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-black text-white/30 shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-white group-hover:text-primary transition truncate">
                      <Link href={`/blog/${post.slug}`} target="_blank">{post.title}</Link>
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-white/40 uppercase tracking-wider">{post.views} views</span>
                      <span className="w-px h-2.5 bg-white/10" />
                      <span className="text-[9px] text-white/40 uppercase tracking-wider">{post.scroll}% depth</span>
                      <span className="w-px h-2.5 bg-white/10" />
                      <span className="text-[9px] text-white/40 uppercase tracking-wider">{post.unique} unique</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-space-grotesk font-bold text-white">{post.time}s</div>
                    <span className="text-[8px] text-white/30 uppercase tracking-widest">avg time</span>
                  </div>
                  {/* Visual scroll depth bar */}
                  <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden shrink-0">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${post.scroll}%` }}
                    />
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                  <BarChart3 className="w-10 h-10 text-white/10 mb-3" />
                  <p className="text-xs text-white/30 font-medium">No analytics data recorded yet.</p>
                  <p className="text-[10px] text-white/20 mt-1">Data will appear once readers visit your published articles.</p>
                </div>
              )}
            </div>
          </div>

          {/* Traffic Sources */}
          <div className="bg-[#080f28] rounded-xl shadow-xl flex flex-col">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/5">
              <Globe className="w-4 h-4 text-blue-400 shrink-0" />
              <h2 className="text-sm font-bold text-white tracking-wide">Traffic Sources</h2>
            </div>

            <div className="flex-1 p-5 space-y-4">
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
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white/70 truncate max-w-[140px]">{c.name}</span>
                      <span className="text-[10px] text-white/40 font-semibold tabular-nums">{c.count}</span>
                    </div>
                    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`bg-gradient-to-r ${gradients[idx % gradients.length]} h-full rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              }) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                  <Globe className="w-8 h-8 text-white/10 mb-2" />
                  <p className="text-xs text-white/30">No traffic data yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
