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
    <div className="bg-[#080f28]/60 backdrop-blur-md border-b border-white/5 px-8 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-10">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-[1.5px] font-dm-sans">
            Total Pipeline Value
          </p>
          <p className="text-2xl font-space font-bold text-[#ff9d00] tracking-tight">
            R {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="h-10 w-[1px] bg-white/5 hidden md:block"></div>

        <div className="flex items-center gap-8">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Active Deals</p>
            <p className="text-lg font-space font-bold text-[#eef2ff]">{activeDeals}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-[#4a5a82] uppercase tracking-widest font-dm-sans">Weighted Won</p>
            <p className="text-lg font-space font-bold text-[#3b82f6]">{wonDeals}</p>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-4">
        <div className="flex -space-x-2">
          {members.slice(0, 4).map((member) => (
            <div 
              key={member.id} 
              title={member.name}
              className="w-8 h-8 rounded-full border-2 border-[#04091a] bg-[#1a1f3d] flex items-center justify-center text-[10px] font-bold text-white/60 hover:text-white transition-colors cursor-help"
            >
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-8 h-8 rounded-full border-2 border-[#04091a] bg-[#2563eb] flex items-center justify-center text-[10px] font-bold text-white">
              +{members.length - 4}
            </div>
          )}
        </div>
        <p className="text-[10px] font-medium text-[#4a5a82] uppercase tracking-wider font-dm-sans">
          Collaborating Personnel
        </p>
      </div>
    </div>
  );
}
