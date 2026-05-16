'use client';

import React from 'react';
import { format, parseISO } from 'date-fns';
import { TimeSlot } from '@/lib/calendar/availability';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlot: string | null;
  onSelectSlot: (iso: string) => void;
  isLoading?: boolean;
}

export function TimeSlotPicker({ slots, selectedSlot, onSelectSlot, isLoading }: TimeSlotPickerProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-12 rounded-xl bg-white/5 animate-pulse border border-white/5"></div>
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl border border-dashed border-white/10 bg-[#080f28]/20 text-center">
        <Clock className="h-8 w-8 text-[#4a5a82] mb-3 opacity-50" />
        <h3 className="text-[13px] font-bold text-[#eef2ff] mb-1">No slots available</h3>
        <p className="text-[11px] text-[#4a5a82]">Try selecting a different date</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {slots.map((slot) => {
        const isSelected = selectedSlot === slot.start;
        const timeStr = format(parseISO(slot.start), 'HH:mm');
        const periodStr = format(parseISO(slot.start), 'aa');

        return (
          <button
            key={slot.start}
            onClick={() => onSelectSlot(slot.start)}
            className={cn(
              "relative group h-11 rounded-xl border transition-all duration-200 flex flex-col items-center justify-center gap-0",
              isSelected 
                ? "bg-[#2563eb] border-[#2563eb] shadow-lg shadow-[#2563eb]/20" 
                : "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
            )}
          >
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-[14px] font-bold font-space tracking-tight",
                isSelected ? "text-white" : "text-[#eef2ff]"
              )}>
                {timeStr}
              </span>
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest opacity-50",
                isSelected ? "text-white" : "text-[#4a5a82]"
              )}>
                {periodStr}
              </span>
            </div>
            
            {isSelected && (
              <div className="absolute top-1 right-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm shadow-black/20"></div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
