'use client';

import React, { useState } from 'react';
import { Target, Plus } from 'lucide-react';
import { CreatePipelineModal } from './CreatePipelineModal';

export function EmptyPipelines() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center text-center space-y-6">
        <div className="w-24 h-24 bg-dash-accent/10 rounded-[2rem] flex items-center justify-center mb-4 shadow-lg shadow-dash-accent/10 rotate-12">
          <Target size={32} className="text-dash-accent" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold !text-dash-text tracking-tight">No pipelines yet</h2>
          <p className="!text-dash-textMuted max-w-sm leading-relaxed text-[13.5px]">
            Create your first sales pipeline to start tracking deals and moving prospects through stages.
          </p>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="h-10 px-8 rounded-[12px] bg-dash-accent text-white hover:bg-dash-accent/90 text-[13px] font-bold flex items-center gap-2 transition-all shadow-lg shadow-dash-accent/20"
        >
          <Plus size={12} />
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
