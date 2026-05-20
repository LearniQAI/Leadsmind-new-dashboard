'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Sparkles, ShieldAlert, AlertTriangle, 
  HelpCircle, Play, EyeOff, Navigation, RefreshCw, Loader2 
} from 'lucide-react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { getSupportAnalytics } from '@/app/actions/analytics';

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const res = await getSupportAnalytics();
      if (res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] text-white font-dm-sans py-12 px-4 md:px-8 relative overflow-hidden">
        
        {/* Decorative Ambient Glowing Gradients */}
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl -z-10" />

        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 bg-[#080f28]/60 border border-white/5 p-6 sm:p-8 rounded-3xl shadow-xl">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Support Operations Controls
              </span>
              <h1 className="font-space-grotesk text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                Help Hub Analytics Matrix
              </h1>
              <p className="text-xs text-white/40 max-w-xl font-light">
                Monitor user reading retention curves, query deficiencies, LENA deflection rates, and support escalation friction zones.
              </p>
            </div>
            
            <button
              onClick={loadAnalytics}
              className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition duration-150 flex items-center justify-center gap-2 border border-white/10 active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
          </div>

          {loading ? (
            <div className="py-32 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <span className="text-xs text-white/40 uppercase tracking-widest font-black">Assembling telemetry aggregations...</span>
            </div>
          ) : !data ? (
            <div className="py-24 text-center text-xs text-white/40 uppercase tracking-widest">
              Failed to load support infrastructure analytics.
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              
              {/* Top Row: Deflection KPI Block */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 p-6 rounded-3xl space-y-2.5 relative shadow-lg">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Deflection Efficiency</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black font-space-grotesk text-white">{data.deflectionRate}%</span>
                    <span className="text-[10px] text-emerald-400 font-bold">▲ Live</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-light">
                    Ratio of conversational LENA AI assistants resolved sessions that did not generate a support desk escalation ticket.
                  </p>
                </div>

                <div className="bg-[#080f28]/60 border border-white/5 p-6 rounded-3xl space-y-2.5 shadow-md">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block">Total Chat Conversations</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black font-space-grotesk text-white">{data.totalChats}</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-widest">Conversations</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-light">
                    Aggregated conversational records logged across workspaces for diagnostics support.
                  </p>
                </div>

                <div className="bg-[#080f28]/60 border border-white/5 p-6 rounded-3xl space-y-2.5 shadow-md">
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">Escalated Tickets</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-black font-space-grotesk text-white">{data.totalTickets}</span>
                    <span className="text-[10px] text-white/30 uppercase tracking-widest">Tickets</span>
                  </div>
                  <p className="text-[11px] text-white/40 leading-relaxed font-light">
                    Support tickets filed via LENA confidence fallthrough filters and staging layout visual regressions.
                  </p>
                </div>

              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Columns - Detailed Logs */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* 1. Zero-Result Search Log */}
                  <div className="bg-[#080f28]/45 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-amber-400" />
                        <span>Zero-Result Search Queries (Content Gaps)</span>
                      </h3>
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded uppercase">
                        Review Needed
                      </span>
                    </div>

                    {data.zeroResults.length === 0 ? (
                      <div className="py-8 text-center text-xs text-white/35">
                        No failed search queries logged. Content library meets query demands.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {data.zeroResults.map((log: any) => (
                          <div key={log.id} className="p-3.5 bg-[#020510]/60 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                              &ldquo;{log.search_query}&rdquo;
                            </span>
                            <span className="text-[9px] text-white/35">
                              {new Date(log.created_at).toLocaleDateString('en-ZA', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 2. Article Unhelpful Rate (> 20%) */}
                  <div className="bg-[#080f28]/45 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <ShieldAlert className="w-4.5 h-4.5 text-rose-500" />
                        <span>Article Unhelpful Rates &gt; 20% (Rewrite Targets)</span>
                      </h3>
                      <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded uppercase">
                        High Priority
                      </span>
                    </div>

                    {data.unhelpfulArticles.length === 0 ? (
                      <div className="py-8 text-center text-xs text-white/35">
                        No articles exceed the 20% unhelpful rating threshold. Good feedback loop.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {data.unhelpfulArticles.map((art: any) => (
                          <div key={art.id} className="p-4 bg-[#020510]/60 border border-white/5 rounded-xl flex items-center justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <span className="inline-block text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-white/50 border border-white/5">
                                {art.category}
                              </span>
                              <h4 className="text-xs font-bold text-white">{art.title}</h4>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <span className="text-[9px] text-white/30 uppercase font-semibold block">Downvotes</span>
                                <span className="text-xs font-bold text-rose-400">{art.helpful_no} / {art.helpful_yes + art.helpful_no}</span>
                              </div>
                              
                              <div className="px-2.5 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-right">
                                <span className="text-[8px] text-rose-400/60 uppercase font-black tracking-widest block">Ratio</span>
                                <span className="text-xs font-black text-rose-400">{art.rate}%</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 3. Zombie Article Monitor */}
                  <div className="bg-[#080f28]/45 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <EyeOff className="w-4.5 h-4.5 text-white/40" />
                        <span>Zombie Article Monitor (Zero reads since seed)</span>
                      </h3>
                      <span className="text-[9px] font-bold text-white/40 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase">
                        Telemetry Archive
                      </span>
                    </div>

                    {data.zombieArticles.length === 0 ? (
                      <div className="py-8 text-center text-xs text-white/35">
                        No zombie articles found. All content library entries have reader impressions.
                      </div>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto pr-1 space-y-2 no-scrollbar">
                        {data.zombieArticles.map((art: any) => (
                          <div key={art.id} className="p-3 bg-[#020510]/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white/70 truncate">{art.title}</h4>
                              <span className="text-[9px] text-white/30 uppercase font-semibold">{art.category}</span>
                            </div>
                            <span className="text-[9px] font-bold text-white/40 uppercase shrink-0">
                              Unread for {art.days_inactive} days
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Right Column - Telemetry charts */}
                <div className="lg:col-span-1 space-y-8">
                  
                  {/* 4. Escalation Hotspots */}
                  <div className="bg-[#080f28]/45 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="pb-3 border-b border-white/[0.04]">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Navigation className="w-4.5 h-4.5 text-primary" />
                        <span>Escalation Hotspots (Friction)</span>
                      </h3>
                    </div>

                    <div className="space-y-3.5">
                      {data.hotspots.map((hot: any, idx: number) => (
                        <div key={idx} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-white/80 font-mono tracking-tight truncate">{hot.path}</span>
                            <span className="font-black text-primary shrink-0">{hot.count} cases</span>
                          </div>
                          {/* visual progress bar */}
                          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full transition-all duration-500" 
                              style={{ width: `${Math.min(100, (hot.count / 10) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 5. Video Drop-off Metrics */}
                  <div className="bg-[#080f28]/45 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="pb-3 border-b border-white/[0.04]">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <Play className="w-4.5 h-4.5 text-primary" />
                        <span>Video Retention Metrics</span>
                      </h3>
                    </div>

                    <div className="space-y-4">
                      {data.videoDropoff.map((drop: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                          <span className="font-bold text-white/50">{drop.timestamp} mark</span>
                          
                          <div className="flex-1 max-w-[120px] h-1.5 bg-white/5 rounded-full overflow-hidden mx-2">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                              style={{ width: `${drop.retention}%` }}
                            />
                          </div>

                          <span className="font-mono text-emerald-400 font-bold shrink-0">{drop.retention}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 6. Contextual Drawer Click Rates */}
                  <div className="bg-[#080f28]/45 border border-white/5 p-6 rounded-3xl space-y-4 shadow-xl">
                    <div className="pb-3 border-b border-white/[0.04]">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-4.5 h-4.5 text-primary" />
                        <span>Contextual Drawer Click Rates</span>
                      </h3>
                    </div>

                    <div className="space-y-3">
                      {data.contextualDrawerClicks.map((click: any, idx: number) => (
                        <div key={idx} className="p-3 bg-[#020510]/50 border border-white/5 rounded-xl flex items-center justify-between gap-2.5">
                          <span className="text-[11px] font-bold text-white font-mono">{click.route}</span>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-white/80 block">{click.clicks} Clicks</span>
                            <span className="text-[8px] text-emerald-400 block">{click.helpfulCount} helpful</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    </Wrapper>
  );
}
