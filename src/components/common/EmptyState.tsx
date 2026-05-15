'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-12 bg-white/[0.02] border border-dashed border-white/10 rounded-[24px]",
      className
    )}>
      <div className="w-16 h-16 bg-[#2563eb]/10 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-2xl shadow-[#2563eb]/10 rotate-12 transition-transform hover:rotate-0 duration-500">
        <i className={cn("fa-solid text-[24px] text-[#2563eb]", icon)}></i>
      </div>
      
      <h2 className="text-[20px] font-bold text-[#eef2ff] mb-2 font-space-grotesk uppercase tracking-tight">
        {title}
      </h2>
      
      <p className="text-[13.5px] text-[#4a5a82] max-w-[280px] mb-8 font-dm-sans leading-relaxed">
        {description}
      </p>
      
      {action && (
        <button
          onClick={action.onClick}
          className="h-10 px-6 rounded-[12px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20 active:scale-95"
        >
          <i className="fa-solid fa-plus text-[12px]"></i>
          {action.label}
        </button>
      )}
    </div>
  );
}
