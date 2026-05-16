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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* 1. Reset Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[28px] font-black text-[#eef2ff] font-space uppercase tracking-tight">Booking <span className="text-[#2563eb]">Nodes</span></h2>
          <p className="text-[11px] font-black text-[#4a5a82] uppercase tracking-[0.3em] mt-2">Initialized tactical nodes for client-driven sessions.</p>
        </div>
        <Button className="h-12 px-8 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white font-black uppercase tracking-widest text-[11px] rounded-[18px] shadow-2xl shadow-[#2563eb]/30 gap-3 group">
          <Plus size={18} className="group-hover:rotate-90 transition-transform" /> Create New Node
        </Button>
      </div>

      {/* 2. Empty Slate Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <button className="flex flex-col items-center justify-center p-12 rounded-[32px] border border-dashed border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-[#2563eb]/30 transition-all duration-500 group text-center min-h-[300px] shadow-2xl">
          <div className="h-16 w-16 rounded-[24px] bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-[#2563eb]/10 transition-all duration-500">
            <Plus className="h-8 w-8 text-[#4a5a82] group-hover:text-[#2563eb]" />
          </div>
          <span className="text-[14px] font-black text-[#4a5a82] group-hover:text-[#eef2ff] transition-colors uppercase tracking-[0.2em] font-space">
            Initialize Neural Node
          </span>
        </button>

        {/* This is where the new high-fidelity cards will be implemented */}
      </div>
    </div>
  );
}
