'use client';

import React from 'react';
import { Lightbulb, Target, TrendingUp, AlertTriangle } from 'lucide-react';

export function TerritoryInsightsPanel({ territories }: { territories: any[] }) {
  if (!territories || territories.length === 0) return null;

  return (
    <div className="bg-n800 border border-white/10 rounded-3xl p-6">
      <h2 className="text-xl font-space font-bold text-white mb-6 flex items-center gap-2">
        <Lightbulb className="text-accent" /> Territory Insights
      </h2>

      <div className="space-y-4">
        {territories.slice(0, 3).map((territory, i) => (
          <div key={i} className="p-5 bg-n900 border border-white/5 rounded-2xl hover:border-accent/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">{territory.region}</h3>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                territory.level === 'High' ? 'bg-emerald-500/20 text-emerald-400' :
                territory.level === 'Medium' ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/10 text-t4'
              }`}>
                {territory.level} Opp
              </span>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-bold text-t4 uppercase tracking-wider mb-4 pb-4 border-b border-white/5">
              <span>{territory.leadCount} Leads</span>
              <span>Score: {territory.score}</span>
            </div>

            <div className="space-y-2">
              {territory.insights.map((insight: any, j: number) => (
                <div key={j} className="flex items-start gap-2 text-sm text-t2">
                  <div className="mt-1">
                    {insight.type === 'opportunity' ? <TrendingUp size={14} className="text-emerald-400" /> :
                     insight.type === 'gap' ? <AlertTriangle size={14} className="text-amber-400" /> :
                     <Target size={14} className="text-blue-400" />}
                  </div>
                  <p>{insight.message}</p>
                </div>
              ))}
              {territory.insights.length === 0 && (
                <p className="text-sm text-t4 italic">Standard market saturation.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
