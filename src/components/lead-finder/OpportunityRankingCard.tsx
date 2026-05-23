'use client';

import React from 'react';
import Link from 'next/link';
import { Target, TrendingUp, DollarSign, Building2, ChevronRight, Activity } from 'lucide-react';

export function OpportunityRankingCard({ opp }: { opp: any }) {
  const isHigh = opp.tier === 'High';
  const isMedium = opp.tier === 'Medium';
  const lead = opp.lead;

  if (!lead) return null;

  return (
    <Link href={`/lead-finder/lead/${lead.id}`}>
      <div className={`border rounded-2xl p-5 hover:bg-white/[0.02] transition-all group h-full flex flex-col justify-between ${
        isHigh ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40' :
        isMedium ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40' :
        'bg-n900 border-white/10 hover:border-white/20'
      }`}>
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                isHigh ? 'bg-emerald-500/20 text-emerald-400' :
                isMedium ? 'bg-amber-500/20 text-amber-400' :
                'bg-white/10 text-t4'
              }`}>
                <Target size={20} />
              </div>
              <div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                  isHigh ? 'bg-emerald-500/20 text-emerald-400' :
                  isMedium ? 'bg-amber-500/20 text-amber-400' :
                  'bg-white/10 text-t4'
                }`}>
                  {opp.tier} Priority
                </span>
                <p className="text-sm font-bold text-white mt-1 group-hover:text-accent transition-colors flex items-center gap-2">
                  {lead.business_name}
                </p>
              </div>
            </div>
            
            <div className={`flex flex-col items-end ${
              isHigh ? 'text-emerald-400' :
              isMedium ? 'text-amber-400' :
              'text-t3'
            }`}>
              <div className="flex items-center gap-1 font-space font-black text-xl">
                <Activity size={16} /> {opp.score}
              </div>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 text-xs text-t3 mt-4">
            <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Building2 size={12} /> {lead.category}</span>
            <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><DollarSign size={12} /> {lead.estimated_value || '0.00'} Value</span>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs font-bold text-t4 group-hover:text-white uppercase tracking-wider transition-colors">
          View Intel <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
