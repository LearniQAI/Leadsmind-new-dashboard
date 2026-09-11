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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-dash-surface border border-dash-border animate-pulse motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 rounded-xl border border-dashed border-dash-border bg-dash-surface text-center">
        <Clock className="h-7 w-7 text-dash-textMuted mb-2.5" strokeWidth={2} />
        <h3 className="text-[13px] font-semibold text-dash-text mb-0.5">No times available</h3>
        <p className="text-[12px] text-dash-textMuted">Try another date</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {slots.map((slot) => {
        const s = slot as any;
        const isSelected = selectedSlot === slot.start;
        const timeStr = format(parseISO(slot.start), 'HH:mm');
        const isFull = s.full === true;
        const spotsLeft: number | undefined = typeof s.spotsLeft === 'number' ? s.spotsLeft : undefined;

        return (
          <button
            key={slot.start}
            onClick={() => onSelectSlot(slot.start)}
            className={cn(
              'relative h-12 rounded-xl border text-center flex flex-col items-center justify-center transition-colors motion-reduce:transition-none',
              isSelected
                ? isFull
                  ? 'bg-amber text-white border-amber'
                  : 'bg-dash-accent text-white border-dash-accent'
                : isFull
                  ? 'bg-amber/5 border-amber/40 text-amber hover:bg-amber/10'
                  : 'bg-white border-dash-border text-dash-text hover:border-dash-accent/40'
            )}
          >
            <span className="text-[14px] font-bold font-space tracking-tight leading-none">{timeStr}</span>
            {isFull ? (
              <span className={cn('text-[10px] font-semibold leading-none mt-0.5', isSelected ? 'text-white/85' : 'text-amber')}>
                Full · waitlist
              </span>
            ) : spotsLeft !== undefined && spotsLeft <= 3 ? (
              <span className={cn('text-[10px] font-medium leading-none mt-0.5', isSelected ? 'text-white/85' : 'text-dash-textMuted')}>
                {spotsLeft} left
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
