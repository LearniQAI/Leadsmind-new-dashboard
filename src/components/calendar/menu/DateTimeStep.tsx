'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { ChevronLeft, Calendar as CalendarIcon, Clock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface DateTimeStepProps {
  onSelect: (date: Date, time: string) => void;
  onBack: () => void;
}

export function DateTimeStep({ onSelect, onBack }: DateTimeStepProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);

  const times = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30'
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center justify-between mb-8">
        <Button
          variant="ghost"
          onClick={onBack}
          className="text-[#4a5a82] hover:text-[#eef2ff] hover:bg-white/5 gap-2 px-0"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-[11px] font-bold uppercase tracking-widest">Back to Provider</span>
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#2563eb]"></div>
          <div className="h-2 w-2 rounded-full bg-[#2563eb]"></div>
          <div className="h-2 w-2 rounded-full bg-[#2563eb]"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
        {/* Calendar Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CalendarIcon className="h-4 w-4 text-[#3b82f6]" />
            <h3 className="text-[14px] font-bold text-[#eef2ff] uppercase tracking-tight font-space">Select Date</h3>
          </div>
          <div className="p-4 bg-[#080f28]/60 border border-white/5 rounded-2xl">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-xl border-none p-0"
              classNames={{
                selected: "bg-[#2563eb] text-white hover:bg-[#2563eb]/90 rounded-lg",
                today: "bg-white/5 text-[#3b82f6] rounded-lg",
                weekday: "text-[#4a5a82] font-bold text-[11px] uppercase tracking-widest",
                day_button: "h-10 w-10 p-0 font-bold font-space text-[13px] text-[#94a3c8] hover:bg-[#2563eb]/10 hover:text-[#eef2ff] rounded-lg transition-all"
              }}
            />
          </div>
        </div>

        {/* Time Slots Column */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-[#3b82f6]" />
            <h3 className="text-[14px] font-bold text-[#eef2ff] uppercase tracking-tight font-space">Time Slots</h3>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
            {times.map((time) => (
              <button
                key={time}
                onClick={() => setSelectedTime(time)}
                className={cn(
                  "py-3 rounded-xl border font-bold font-space text-[13px] transition-all duration-300",
                  selectedTime === time
                    ? "bg-[#2563eb] border-[#2563eb] text-white shadow-lg shadow-[#2563eb]/20"
                    : "bg-white/5 border-white/5 text-[#4a5a82] hover:bg-[#2563eb]/10 hover:border-[#2563eb]/30 hover:text-[#eef2ff]"
                )}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-white/5 flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest">Selected Session</p>
          <p className="text-[14px] font-bold text-[#eef2ff] font-space">
            {date ? format(date, 'MMM dd, yyyy') : 'No date selected'} {selectedTime && `@ ${selectedTime}`}
          </p>
        </div>
        <Button
          disabled={!date || !selectedTime}
          onClick={() => date && selectedTime && onSelect(date, selectedTime)}
          className="bg-[#2563eb] hover:bg-[#2563eb]/90 text-white rounded-xl font-bold text-[13px] px-8 h-11 shadow-lg shadow-[#2563eb]/20"
        >
          Confirm Availability
        </Button>
      </div>
    </div>
  );
}
