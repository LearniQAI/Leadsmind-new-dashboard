'use client';

import React, { useState } from 'react';
import { analyzeOpportunity } from '@/app/actions/opportunity-workspace';
import { Target, Activity, Globe, Lightbulb, Loader2, Play } from 'lucide-react';

export function OpportunityIntelligencePanel({ leadId, opportunity, recommendations, websiteAnalysis }: { leadId: string, opportunity?: any, recommendations?: any[], websiteAnalysis?: any }) {
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    await analyzeOpportunity(leadId);
    window.location.reload();
  };

  if (!opportunity) {
    return (
      <div className="bg-n800 border border-white/10 rounded-3xl p-6 text-center">
        <Target size={32} className="text-t4 mx-auto mb-3 opacity-50" />
        <h3 className="text-lg font-bold text-white mb-2">Opportunity Intelligence</h3>
        <p className="text-sm text-t3 mb-6">Run deep analysis on this lead to uncover service gaps, calculate priority, and generate pitch recommendations.</p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-6 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl font-bold uppercase tracking-wider transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          Run Analysis
        </button>
      </div>
    );
  }

  const isHigh = opportunity.tier === 'High';

  return (
    <div className="space-y-6">
      {/* Priority Banner */}
      <div className={`rounded-3xl p-6 border ${isHigh ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-n800 border-white/10'}`}>
        <div className="flex items-center justify-between">
          <div>
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm mb-2 inline-block ${isHigh ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-t4'}`}>
              {opportunity.tier} Priority
            </span>
            <h3 className={`text-2xl font-space font-black ${isHigh ? 'text-emerald-400' : 'text-white'}`}>Opportunity Score: {opportunity.score}/100</h3>
          </div>
          <Activity size={48} className={isHigh ? 'text-emerald-400 opacity-20' : 'text-t4 opacity-20'} />
        </div>
      </div>

      {/* Website Health */}
      {websiteAnalysis && (
        <div className="bg-n800 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-space font-bold text-white mb-4 flex items-center gap-2">
            <Globe className="text-accent" /> Website Infrastructure
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-4 rounded-xl border ${websiteAnalysis.has_https ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className="text-xs text-t4 uppercase tracking-wider mb-1">Security</p>
              <p className={`font-bold ${websiteAnalysis.has_https ? 'text-emerald-400' : 'text-red-400'}`}>{websiteAnalysis.has_https ? 'Secure (HTTPS)' : 'Insecure'}</p>
            </div>
            <div className={`p-4 rounded-xl border ${websiteAnalysis.mobile_responsive ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className="text-xs text-t4 uppercase tracking-wider mb-1">Mobile</p>
              <p className={`font-bold ${websiteAnalysis.mobile_responsive ? 'text-emerald-400' : 'text-red-400'}`}>{websiteAnalysis.mobile_responsive ? 'Responsive' : 'Legacy'}</p>
            </div>
            <div className={`p-4 rounded-xl border ${websiteAnalysis.has_booking ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
              <p className="text-xs text-t4 uppercase tracking-wider mb-1">Conversion</p>
              <p className={`font-bold ${websiteAnalysis.has_booking ? 'text-emerald-400' : 'text-amber-400'}`}>{websiteAnalysis.has_booking ? 'Booking Active' : 'No Booking'}</p>
            </div>
            <div className="p-4 rounded-xl border bg-n900 border-white/5">
              <p className="text-xs text-t4 uppercase tracking-wider mb-1">Health Score</p>
              <p className="font-bold text-white">{websiteAnalysis.health_score}/100</p>
            </div>
          </div>
        </div>
      )}

      {/* Strategic Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="bg-n800 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-space font-bold text-white mb-4 flex items-center gap-2">
            <Lightbulb className="text-amber-400" /> Strategic Recommendations
          </h3>
          <div className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="px-2 py-1 bg-white/10 rounded text-[10px] uppercase tracking-widest font-bold text-t3 shrink-0">
                  {rec.type.replace('_', ' ')}
                </div>
                <p className="text-sm text-white">{rec.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
