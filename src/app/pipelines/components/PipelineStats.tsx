'use client';

import React from 'react';
import { DollarSign, Layers, Trophy } from 'lucide-react';
import { Opportunity } from '@/types/crm';

interface PipelineStatsProps {
  opportunities: Opportunity[];
  members: { id: string, name: string }[];
}

// Belt-and-suspenders fix for "R 0.00" reading as "R O.OO" — see the
// matching comment in ./KanbanColumn.tsx for why this stays on DM Sans
// (body font) rather than switching typeface.
const NUMERIC_STYLE: React.CSSProperties = {
  fontVariantNumeric: "slashed-zero tabular-nums",
  fontFeatureSettings: '"zero" 1',
};

export function PipelineStats({ opportunities, members }: PipelineStatsProps) {
  const totalValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);
  const activeDeals = opportunities.filter(opp => opp.status === 'open').length;
  const wonDeals = opportunities.filter(opp => opp.status === 'won').length;

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-dash-border px-8 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 pr-4">
          {/* bg-amber-50/text-amber-600 previously rendered as no-op classes —
              this project's custom `amber` token (tailwind.config.js) is a flat
              hex, not a 50-900 shade scale, so numbered amber utilities silently
              generate no CSS. Bare-token + opacity-modifier is the working
              pattern already used elsewhere in this codebase (see dash-accent
              usage below). See end-of-task report for the wider scope of this. */}
          <div className="w-9 h-9 rounded-xl bg-amber/10 !text-amber flex items-center justify-center flex-shrink-0">
            <DollarSign size={16} />
          </div>
          <div>
            <p className="text-[10px] font-bold !text-dash-textMuted tracking-[1.5px]">
              Total Pipeline Value
            </p>
            <p className="text-[28px] font-extrabold !text-dash-text leading-tight" style={NUMERIC_STYLE}>
              R {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="h-10 w-[1px] bg-dash-border/60 hidden md:block"></div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-dash-accent/10 !text-dash-accent flex items-center justify-center flex-shrink-0">
              <Layers size={15} />
            </div>
            <div>
              <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">Active Deals</p>
              <p className="text-lg font-bold !text-dash-text leading-tight" style={NUMERIC_STYLE}>{activeDeals}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 !text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Trophy size={15} />
            </div>
            <div>
              <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">Weighted Won</p>
              <p className="text-lg font-bold !text-emerald-600 leading-tight" style={NUMERIC_STYLE}>{wonDeals}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-4">
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((member) => (
            <div 
              key={member.id} 
              title={member.name}
              className="w-8 h-8 rounded-full border-2 border-white bg-dash-border flex items-center justify-center text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text transition-colors cursor-help"
            >
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-8 h-8 rounded-full border-2 border-white bg-dash-accent flex items-center justify-center text-[10px] font-bold text-white">
              +{members.length - 4}
            </div>
          )}
        </div>
        <p className="text-[10px] font-medium !text-dash-textMuted tracking-wider">
          Collaborating Personnel
        </p>
      </div>
    </div>
  );
}
