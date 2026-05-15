'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onAddTag: () => void;
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onClear,
  onDelete,
  onAddTag,
  className
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      <div className="bg-[#080f28] border border-white/10 rounded-[16px] px-6 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-6 backdrop-blur-xl">
        <div className="flex items-center gap-3 pr-6 border-r border-white/5">
          <span className="bg-[#2563eb] text-white text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center font-space-grotesk">
            {selectedCount}
          </span>
          <span className="text-[12px] font-bold text-[#eef2ff] uppercase tracking-widest font-dm-sans">
            Selected
          </span>
          <button 
            onClick={onClear}
            className="text-[10px] font-bold text-[#4a5a82] hover:text-[#eef2ff] transition-colors uppercase tracking-widest ml-1"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={onAddTag}
            className="h-9 px-4 rounded-lg bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all"
          >
            <i className="fa-solid fa-tag text-[#3b82f6] text-[12px]"></i>
            Add Tag
          </button>
          
          <button 
            onClick={onDelete}
            className="h-9 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-[12px] font-bold font-dm-sans flex items-center gap-2 transition-all"
          >
            <i className="fa-solid fa-trash-can text-[12px]"></i>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
