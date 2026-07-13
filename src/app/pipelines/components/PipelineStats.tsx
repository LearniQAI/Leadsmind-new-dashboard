'use client';

import React from 'react';
import { Opportunity } from '@/types/crm';

interface PipelineStatsProps {
  opportunities: Opportunity[];
  members: { id: string, name: string }[];
}

export function PipelineStats({ opportunities, members }: PipelineStatsProps) {
  const totalValue = opportunities.reduce((acc, opp) => acc + (Number(opp.value) || 0), 0);
  const activeDeals = opportunities.filter(opp => opp.status === 'open').length;
  const wonDeals = opportunities.filter(opp => opp.status === 'won').length;

  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-dash-border px-8 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold !text-dash-textMuted tracking-[1.5px]">
            Total Pipeline Value
          </p>
          <p className="text-2xl  font-bold text-amber-600 tracking-tight">
            R {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="h-10 w-[1px] bg-dash-surface hidden md:block"></div>

        <div className="flex items-center gap-8">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">Active Deals</p>
            <p className="text-lg  font-bold !text-dash-text">{activeDeals}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold !text-dash-textMuted tracking-widest">Weighted Won</p>
            <p className="text-lg  font-bold text-dash-accent">{wonDeals}</p>
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
