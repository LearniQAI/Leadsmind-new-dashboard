'use client';

import React from 'react';
import { DollarSign, Layers, Trophy } from 'lucide-react';
import { Opportunity } from '@/types/crm';
import { CurrencyValue, NumeralText } from '@/components/dashboard-ui';

// One shared class string for all three stat values (Total Pipeline Value /
// Active Deals / Weighted Won) — a single source so the "matched treatment"
// is structurally guaranteed, not three independently-typed class strings
// that happen to currently agree. DM Sans (no font-display), matching the
// main dashboard's own KPI-card value convention
// (HomeDashboardClient.tsx's `text-[36px] font-bold !text-[#0F172A]
// tracking-tight` — same idea, sized down for this page's more compact
// single-row stat strip rather than full standalone cards).
const STAT_VALUE_CLASS = 'text-[24px] font-bold !text-dash-text tracking-tight leading-none block';

export function PipelineStats({ opportunities, members }: { opportunities: Opportunity[]; members: { id: string, name: string }[] }) {
  const totalValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);
  const activeDeals = opportunities.filter(opp => opp.status === 'open').length;
  const wonDeals = opportunities.filter(opp => opp.status === 'won').length;

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-dash-border px-8 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5 pr-4">
          {/* bg-amber-50/text-amber-600 previously rendered as no-op classes —
              this project's custom `amber` token (tailwind.config.js) is a flat
              hex, not a 50-900 shade scale, so numbered amber utilities silently
              generate no CSS. Bare-token + opacity-modifier is the working
              pattern already used elsewhere in this codebase (see dash-accent
              usage below). See end-of-task report for the wider scope of this. */}
          <div className="w-8 h-8 rounded-lg bg-amber/10 !text-amber flex items-center justify-center flex-shrink-0">
            <DollarSign size={14} />
          </div>
          <div>
            <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">
              Total Pipeline Value
            </p>
            <CurrencyValue value={totalValue} className={STAT_VALUE_CLASS} />
          </div>
        </div>

        <div className="h-8 w-[1px] bg-dash-border/60 hidden md:block"></div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-dash-accent/10 !text-dash-accent flex items-center justify-center flex-shrink-0">
              <Layers size={13} />
            </div>
            <div>
              <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">Active Deals</p>
              <NumeralText className={STAT_VALUE_CLASS}>{activeDeals}</NumeralText>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 !text-emerald-600 flex items-center justify-center flex-shrink-0">
              <Trophy size={13} />
            </div>
            <div>
              <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">Weighted Won</p>
              <NumeralText className={STAT_VALUE_CLASS}>{wonDeals}</NumeralText>
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
              className="w-7 h-7 rounded-full border-2 border-white bg-dash-border flex items-center justify-center text-[9px] font-bold !text-dash-textMuted hover:!text-dash-text transition-colors cursor-help"
            >
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-7 h-7 rounded-full border-2 border-white bg-dash-accent flex items-center justify-center text-[9px] font-bold text-white">
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
