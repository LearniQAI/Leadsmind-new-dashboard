'use client';

import React, { useState } from 'react';
import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';
import { KanbanBoard } from '@/components/crm/KanbanBoard';
import { PipelineSelector } from '@/components/crm/PipelineSelector';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface PipelineClientProps {
  pipelines: Pipeline[];
  stages: PipelineStage[];
  opportunities: Opportunity[];
  activePipelineId: string;
}

export default function PipelineClient({
  pipelines,
  stages,
  opportunities,
  activePipelineId
}: PipelineClientProps) {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full bg-[#04091a]">
      {/* Tactical Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <h1 className="text-[22px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1.5 font-space-grotesk">
              Strategic <span className="text-[#3b82f6]">Pipelines</span>
            </h1>
            <p className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
              Track and manage high-value sales opportunities
            </p>
          </div>
          
          <div className="h-10 w-[1px] bg-white/5 hidden md:block" />
          
          <PipelineSelector
            pipelines={pipelines}
            activePipelineId={activePipelineId}
          />
        </div>

        <div className="flex items-center gap-3">
           <button className="h-9 px-4 rounded-[8px] bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-semibold font-dm-sans flex items-center gap-2 transition-all">
              <i className="fa-solid fa-gear text-[13px] text-[#4a5a82]"></i>
              Configure Stages
           </button>
           <button className="h-9 px-4 rounded-[8px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20">
              <i className="fa-solid fa-plus text-[12px]"></i>
              New Opportunity
           </button>
        </div>
      </div>

      {/* Main Kanban Workspace */}
      <div className="flex-1 overflow-hidden px-6 pb-6">
        <KanbanBoard stages={stages} opportunities={opportunities} />
      </div>
    </div>
  );
}
