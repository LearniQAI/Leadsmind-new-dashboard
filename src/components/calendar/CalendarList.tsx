'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  Plus,
  Sparkles,
  Globe,
  Settings,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Calendar {
  id: string;
  name: string;
  slug: string;
  slot_duration: number;
}

interface CalendarListProps {
  calendars: Calendar[];
}

export function CalendarList({ calendars = [] }: CalendarListProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700 motion-reduce:animate-none">
      {/* 1. Reset Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-bold !text-dash-text">Booking <span className="text-dash-accent">nodes</span></h2>
          <p className="text-[11px] font-bold !text-dash-textMuted mt-2">Initialized tactical nodes for client-driven sessions.</p>
        </div>
        <Button className="h-12 px-8 bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] rounded-[18px] shadow-lg shadow-dash-accent/20 gap-3 group transition-colors motion-reduce:transition-none">
          <Plus size={18} className="group-hover:rotate-90 motion-reduce:group-hover:rotate-0 transition-transform motion-reduce:transition-none" /> Create new node
        </Button>
      </div>

      {/* 2. Empty Slate Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button className="flex flex-col items-center justify-center p-12 rounded-[32px] border border-dashed border-dash-border bg-dash-surface hover:bg-dash-border/30 hover:border-dash-accent/30 transition-all motion-reduce:transition-none duration-500 group text-center min-h-[300px] shadow-sm">
          <div className="h-16 w-16 rounded-[24px] bg-white flex items-center justify-center mb-6 group-hover:scale-110 motion-reduce:group-hover:scale-100 group-hover:bg-dash-accent/10 transition-all motion-reduce:transition-none duration-500">
            <Plus className="h-8 w-8 !text-dash-textMuted group-hover:text-dash-accent" />
          </div>
          <span className="text-[14px] font-bold !text-dash-textMuted group-hover:!text-dash-text transition-colors motion-reduce:transition-none">
            Initialize neural node
          </span>
        </button>

        {/* This is where the new high-fidelity cards will be implemented */}
      </div>
    </div>
  );
}
