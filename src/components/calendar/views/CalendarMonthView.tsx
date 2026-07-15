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
    <div className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm">
      {/* Month Header Control */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-dash-border bg-dash-surface">
        <div className="flex items-center gap-4">
          <h2 className="text-[18px] font-bold !text-dash-text min-w-[150px]">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
          <div className="flex items-center bg-white rounded-lg p-1 border border-dash-border">
            <button onClick={prevMonth} className="p-1.5 hover:bg-dash-surface rounded-lg !text-dash-textMuted transition-all motion-reduce:transition-none">
              <ChevronLeft size={16} />
            </button>
            <button onClick={goToToday} className="px-3 py-1 text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text transition-all motion-reduce:transition-none">
              Today
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:bg-dash-surface rounded-lg !text-dash-textMuted transition-all motion-reduce:transition-none">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2 text-[11px] font-semibold !text-dash-textMuted">
            <span className="w-2 h-2 rounded-full bg-dash-accent" /> Consultation
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold !text-dash-textMuted">
            <span className="w-2 h-2 rounded-full bg-green" /> Follow-up
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold !text-dash-textMuted">
            <span className="w-2 h-2 rounded-full bg-purple" /> Demo
          </div>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 border-b border-dash-border bg-dash-surface">
        {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-bold !text-dash-textMuted tracking-[0.2em] border-r border-dash-border last:border-r-0">
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
                "min-h-[140px] border-r border-b border-dash-border p-3 transition-all motion-reduce:transition-none relative group cursor-pointer",
                !isCurrentMonth ? "bg-dash-surface" : "bg-transparent hover:bg-dash-surface"
              )}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={cn(
                  "text-[12px] font-bold w-7 h-7 flex items-center justify-center rounded-full transition-all motion-reduce:transition-none",
                  isToday ? "bg-dash-accent text-white" : isCurrentMonth ? "!text-dash-textMuted" : "!text-dash-textMuted opacity-50"
                )}>
                  {format(day, 'd')}
                </span>
                {dayAppointments.length > 0 && (
                  <span className="text-[10px] font-bold !text-dash-textMuted opacity-60 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
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
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold truncate border border-dash-border shadow-sm cursor-pointer hover:scale-[1.02] motion-reduce:hover:scale-100 transition-transform motion-reduce:transition-none active:scale-[0.98] motion-reduce:active:scale-100"
                    style={{
                      backgroundColor: appt.color || 'rgba(19, 89, 255, 0.08)',
                      color: appt.text_color || '#1359FF',
                      borderLeft: `3px solid ${appt.border_color || '#1359FF'}`
                    }}
                  >
                    {format(new Date(appt.start_time), 'HH:mm')} {appt.title}
                  </div>
                ))}
                {dayAppointments.length > 4 && (
                  <div className="text-[10px] font-bold !text-dash-textMuted pl-1">
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
