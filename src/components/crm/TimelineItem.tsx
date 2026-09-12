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
      case 'note': return 'fa-note-sticky text-blue-500';
      case 'deal': return 'fa-handshake text-emerald-600';
      case 'task': return 'fa-list-check text-amber-500';
      case 'edit': return 'fa-pen-to-square text-pink-500';
      case 'system': return 'fa-robot text-purple-500';
      default: return 'fa-circle-dot text-dash-textMuted';
    }
  };

  return (
    <div className="relative flex items-start group">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-dash-surface border border-dash-border shadow-sm z-10 shrink-0 transition-all group-hover:border-dash-accent/40">
        <i className={cn("fa-solid text-[14px]", getIcon(activity.type))}></i>
      </div>
      <div className="flex-1 ml-6 pt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-bold text-dash-text uppercase tracking-widest font-space-grotesk">
            {activity.type}
          </span>
          <span className="text-[10px] text-dash-textMuted font-medium font-dm-sans">
            {format(new Date(activity.created_at), 'MMM dd, yyyy · hh:mm a')}
          </span>
        </div>
        <p className="text-[13.5px] text-dash-textMuted leading-relaxed font-dm-sans">
          {activity.description}
        </p>
        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <div className="mt-3 bg-dash-bg border border-dash-border rounded-lg p-3 text-[11px] text-dash-textMuted font-mono overflow-x-auto max-h-40 common-scrollbar">
            <pre className="whitespace-pre-wrap">{JSON.stringify(activity.metadata, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
