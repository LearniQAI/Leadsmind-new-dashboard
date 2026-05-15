'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ContactActivity } from '@/types/crm';
import { format } from 'date-fns';

interface TimelineItemProps {
  activity: ContactActivity;
}

export function TimelineItem({ activity }: TimelineItemProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'note': return 'fa-note-sticky text-[#3b82f6]';
      case 'deal': return 'fa-handshake text-[#10b981]';
      case 'task': return 'fa-list-check text-[#f59e0b]';
      case 'edit': return 'fa-pen-to-square text-[#ec4899]';
      case 'system': return 'fa-robot text-[#8b5cf6]';
      default: return 'fa-circle-dot text-[#4a5a82]';
    }
  };

  return (
    <div className="relative flex items-start group">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#080f28] border border-white/10 shadow-lg z-10 shrink-0 transition-all group-hover:border-[#2563eb]/40">
        <i className={cn("fa-solid text-[14px]", getIcon(activity.type))}></i>
      </div>
      <div className="flex-1 ml-6 pt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-[#eef2ff] uppercase tracking-widest font-space-grotesk">
            {activity.type}
          </span>
          <span className="text-[10px] text-[#4a5a82] font-medium font-dm-sans">
            {format(new Date(activity.created_at), 'MMM dd, yyyy · hh:mm a')}
          </span>
        </div>
        <p className="text-[13.5px] text-[#94a3c8] leading-relaxed font-dm-sans">
          {activity.description}
        </p>
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-3 bg-white/[0.02] border border-white/5 rounded-lg p-3 text-[11px] text-[#4a5a82] font-mono overflow-x-auto max-h-40 common-scrollbar">
            <pre className="whitespace-pre-wrap">{JSON.stringify(activity.metadata, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
