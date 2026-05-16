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
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 py-4 border-y border-[var(--bdr)] mb-8">
      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        {['All Calendars', 'Personal', 'Round Robin', 'Collective', 'Class'].map((filter, i) => (
          <button
            key={filter}
            className={cn(
              "px-4 py-1.5 rounded-full text-[12.5px] font-medium transition-all whitespace-nowrap",
              i === 0 
                ? "bg-[var(--accentg)] text-[var(--accent2)] border border-[rgba(37,99,235,0.2)]" 
                : "text-[var(--t2)] hover:text-[var(--t1)] hover:bg-[rgba(255,255,255,0.05)]"
            )}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center bg-[rgba(255,255,255,0.03)] border border-[var(--bdr)] rounded-[var(--r8)] p-1">
        {views.map((v) => {
          const Icon = v.icon;
          const isActive = activeView === v.id;
          return (
            <button
              key={v.id}
              onClick={() => onViewChange(v.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-[var(--r8)] text-[12px] font-semibold transition-all",
                isActive 
                  ? "bg-[var(--accent)] text-white shadow-sm" 
                  : "text-[var(--t3)] hover:text-[var(--t2)] hover:bg-[rgba(255,255,255,0.03)]"
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
