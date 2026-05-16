'use client';

import React, { useState } from 'react';
import { CreatePipelineModal } from './CreatePipelineModal';

export function EmptyPipelines() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 bg-[#2563eb]/10 rounded-[2rem] flex items-center justify-center mb-4 shadow-2xl shadow-[#2563eb]/10 rotate-12">
          <i className="fa-solid fa-bullseye text-[32px] text-[#2563eb]"></i>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-[#eef2ff] uppercase tracking-tight font-space">No pipelines yet</h2>
          <p className="text-[#4a5a82] max-w-sm leading-relaxed font-dm-sans text-[13.5px]">
            Create your first sales pipeline to start tracking deals and moving prospects through stages.
          </p>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="h-10 px-8 rounded-[12px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20"
        >
          <i className="fa-solid fa-plus text-[12px]"></i>
          Create Pipeline
        </button>
      </div>

      <CreatePipelineModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
