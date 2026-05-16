'use client';

import React, { useState } from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarMonthViewProps {
  appointments: any[];
  onDayClick?: (date: Date) => void;
  onAppointmentClick?: (appointment: any) => void;
}

export default function CalendarMonthView({ 
  appointments, 
  onDayClick, 
  onAppointmentClick 
}: CalendarMonthViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="bg-[var(--card)] border border-[var(--bdr)] rounded-[var(--r16)] overflow-hidden shadow-2xl">
      {/* Month Header Control */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--bdr)] bg-[rgba(255,255,255,0.01)]">
        <div className="flex items-center gap-4">
          <h2 className="text-[18px] font-bold font-['Space_Grotesk'] text-[var(--t1)] min-w-[150px]">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center bg-[var(--n700)] rounded-[var(--r8)] p-1 border border-[var(--bdr)]">
            <button onClick={prevMonth} className="p-1.5 hover:bg-[var(--n600)] rounded-[var(--r8)] text-[var(--t2)] transition-all">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--t2)] hover:text-[var(--t1)] transition-all">
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-[var(--n600)] rounded-[var(--r8)] text-[var(--t2)] transition-all">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" /> Consultation
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[var(--green)]" /> Follow-up
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--t3)] uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[var(--purple)]" /> Demo
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-[var(--bdr)] bg-[var(--n900)] bg-opacity-50">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-black text-[var(--t4)] tracking-[0.2em] border-r border-[var(--bdr)] last:border-r-0">
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar Grid */}
      <div className="grid grid-cols-7 auto-rows-fr min-h-[700px]">
        {calendarDays.map((day, i) => {
          const dayAppointments = appointments.filter(appt => isSameDay(new Date(appt.start_time), day));
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <div 
              key={day.toString()} 
              onClick={() => isCurrentMonth && onDayClick?.(day)}
              className={cn(
                "min-h-[140px] border-r border-b border-[var(--bdr)] p-3 transition-all relative group cursor-pointer",
                !isCurrentMonth ? "bg-[rgba(4,9,26,0.4)]" : "bg-transparent hover:bg-[rgba(255,255,255,0.02)]"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={cn(
                  "text-[12px] font-bold font-['Space_Grotesk'] w-7 h-7 flex items-center justify-center rounded-full transition-all",
                  isToday ? "bg-[var(--accent)] text-white" : isCurrentMonth ? "text-[var(--t2)]" : "text-[var(--t4)]"
                )}>
                  {format(day, 'd')}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[10px] font-black text-[var(--t3)] opacity-40 group-hover:opacity-100 transition-opacity">
                    {dayAppointments.length} EVENT{dayAppointments.length > 1 ? 'S' : ''}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                {dayAppointments.slice(0, 4).map((appt, idx) => (
                  <div 
                    key={appt.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick?.(appt);
                    }}
                    className="px-2 py-1 rounded-[var(--r8)] text-[11px] font-semibold truncate border border-[rgba(255,255,255,0.05)] shadow-sm cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]"
                    style={{ 
                      backgroundColor: appt.color || 'var(--accentg)', 
                      color: appt.text_color || 'var(--accent2)',
                      borderLeft: `3px solid ${appt.border_color || 'var(--accent)'}`
                    }}
                  >
                    {format(new Date(appt.start_time), 'HH:mm')} {appt.title}
                  </div>
                ))}
                {dayAppointments.length > 4 && (
                  <div className="text-[10px] font-bold text-[var(--t3)] pl-1">
                    + {dayAppointments.length - 4} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
