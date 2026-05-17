'use client';

import React from 'react';
import { Filter, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  onCreateFunnel: () => void;
}

export function EmptyState({ onCreateFunnel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white/[0.02] border border-dashed border-white/[0.07] rounded-[16px] text-center w-full select-none">
      {/* Icon accent */}
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 text-[#4a5a82] border border-white/5 shadow-xl">
        <Filter size={32} strokeWidth={1.5} className="text-[#3b82f6]" />
      </div>
      
      {/* Target headers */}
      <h3 className="text-[15px] font-semibold text-[#eef2ff] mb-2 font-display uppercase tracking-wider">
        No funnels created yet
      </h3>
      <p className="text-[13px] text-[#4a5a82] max-w-[320px] leading-relaxed mb-6">
        Map your marketing conversion flows sequentially and capture prospective client leads automatically.
      </p>

      {/* CTA Button */}
      <Button
        onClick={onCreateFunnel}
        className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-[8px] font-semibold text-[13px] h-10 px-6 shadow-lg shadow-[#2563eb]/20 flex items-center gap-2 transition-all active:scale-[0.98]"
      >
        <Plus className="h-4 w-4" />
        <span>Create First Funnel</span>
      </Button>
    </div>
  );
}
