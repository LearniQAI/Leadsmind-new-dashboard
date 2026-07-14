'use client';

import React from 'react';
import { Calendar, LayoutGrid, List, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CalendarView = 'month' | 'week' | 'day' | 'list' | 'pages';

interface CalendarToolbarProps {
  activeView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

export default function CalendarToolbar({ activeView, onViewChange }: CalendarToolbarProps) {
  const views = [
    { id: 'month', label: 'Month', icon: Calendar },
    { id: 'week', label: 'Week', icon: LayoutGrid },
    { id: 'day', label: 'Day', icon: List },
    { id: 'list', label: 'List View', icon: List },
    { id: 'pages', label: 'Booking Pages', icon: Layers },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-y border-dash-border mb-8">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        {['All calendars', 'Personal', 'Round robin', 'Collective', 'Class'].map((filter, i) => (
          <button
            key={filter}
            className={cn(
              "px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-colors motion-reduce:transition-none whitespace-nowrap",
              i === 0
                ? "bg-dash-accent/10 text-dash-accent border border-dash-accent/20"
                : "!text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center bg-dash-surface border border-dash-border rounded-lg p-1">
        {views.map((v) => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors motion-reduce:transition-none",
                isActive
                  ? "bg-dash-accent text-white shadow-sm"
                  : "!text-dash-textMuted hover:!text-dash-text hover:bg-dash-border/40"
              )}
            >
              <Icon size={14} />
              {v.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
