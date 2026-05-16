'use client';

import React, { useState } from 'react';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameDay, 
  addWeeks, 
  subWeeks,
  startOfDay,
  addHours
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarWeekViewProps {
  appointments: any[];
}

export default function CalendarWeekView({ appointments }: CalendarWeekViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(weekStart);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const hours = Array.from({ length: 24 }).map((_, i) => i);

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r16)] overflow-hidden shadow-2xl flex flex-col h-[800px]">
      {/* Header Control */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bdr)] bg-[rgba(255,255,255,0.01)]">
        <div className="flex items-center gap-4">
          <h2 className="text-[18px] font-bold font-['Space_Grotesk'] text-[var(--t1)] min-w-[200px]">
            {format(weekStart, 'MMM d')} — {format(weekEnd, 'MMM d, yyyy')}
          </h2>
          <div className="flex items-center bg-[var(--n700)] rounded-[var(--r8)] p-1 border border-[var(--bdr)]">
            <button onClick={prevWeek} className="p-1.5 hover:bg-[var(--n600)] rounded-[var(--r8)] text-[var(--t2)] transition-all">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--t2)] hover:text-[var(--t1)] transition-all">
              Today
            </button>
            <button onClick={nextWeek} className="p-1.5 hover:bg-[var(--n600)] rounded-[var(--r8)] text-[var(--t2)] transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Viewport Wrapper */}
      <div className="flex-1 overflow-y-auto no-scrollbar relative flex">
        {/* Time Labels Column */}
        <div className="w-[70px] border-r border-[var(--bdr)] bg-[var(--n900)] bg-opacity-50 sticky left-0 z-20">
          <div className="h-[60px] border-b border-[var(--bdr)]" /> {/* Corner Spacer */}
          {hours.map(hour => (
            <div key={hour} className="h-[60px] text-[10px] font-bold text-[var(--t4)] flex items-start justify-center pt-2">
              {format(addHours(startOfDay(new Date()), hour), 'ha')}
            </div>
          ))}
        </div>

        {/* Days Columns */}
        <div className="flex-1 grid grid-cols-7 min-w-[700px]">
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            const dayAppointments = appointments.filter(appt => isSameDay(new Date(appt.start_time), day));

            return (
              <div key={day.toString()} className="relative border-r border-[var(--bdr)] last:border-r-0">
                {/* Day Header */}
                <div className={cn(
                  "h-[60px] border-b border-[var(--bdr)] sticky top-0 bg-[var(--n800)] z-10 flex flex-col items-center justify-center gap-1",
                  isToday ? "bg-[rgba(37,99,235,0.05)]" : ""
                )}>
                  <span className="text-[10px] font-black text-[var(--t4)] uppercase tracking-widest">
                    {format(day, 'EEE')}
                  </span>
                  <span className={cn(
                    "text-[14px] font-bold font-['Space_Grotesk'] w-7 h-7 flex items-center justify-center rounded-full",
                    isToday ? "bg-[var(--accent)] text-white" : "text-[var(--t1)]"
                  )}>
                    {format(day, 'd')}
                  </span>
                </div>

                {/* Grid Lines */}
                {hours.map(hour => (
                  <div key={hour} className="h-[60px] border-b border-[var(--bdr)] border-opacity-50" />
                ))}

                {/* Appointments Overlay */}
                {dayAppointments.map(appt => {
                   const start = new Date(appt.start_time);
                   const top = (start.getHours() * 60 + start.getMinutes()); // px from top
                   // Duration logic would go here for height
                   return (
                     <div 
                       key={appt.id}
                       className="absolute left-1 right-1 rounded-[var(--r8)] p-2 text-[11px] font-bold border border-[rgba(255,255,255,0.1)] shadow-lg overflow-hidden group hover:z-30 transition-all"
                       style={{ 
                         top: `${60 + top}px`, 
                         minHeight: '50px',
                         backgroundColor: appt.color || 'var(--accentg)', 
                         color: appt.text_color || 'var(--accent2)',
                         borderLeft: `4px solid ${appt.border_color || 'var(--accent)'}`
                       }}
                     >
                       <div className="flex items-center gap-1 mb-1 opacity-70">
                         <Clock size={10} />
                         {format(start, 'h:mm a')}
                       </div>
                       <div className="truncate">{appt.title}</div>
                     </div>
                   );
                })}

                {/* Current Time Indicator */}
                {isToday && (
                  <div 
                    className="absolute left-0 right-0 h-[2px] bg-[var(--red)] z-20 pointer-events-none"
                    style={{ top: `${60 + (new Date().getHours() * 60 + new Date().getMinutes())}px` }}
                  >
                    <div className="absolute left-0 -top-[4px] w-[10px] h-[10px] bg-[var(--red)] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
