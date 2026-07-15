'use client';

import React, { useState } from 'react';
import {
  format,
  isSameDay,
  addDays,
  subDays,
  startOfDay,
  addHours
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, MapPin, User, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarDayViewProps {
  appointments: any[];
}

export default function CalendarDayView({ appointments }: CalendarDayViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const hours = Array.from({ length: 24 }).map((_, i) => i);
  const dayAppointments = appointments.filter(appt => isSameDay(new Date(appt.start_time), currentDate));

  const nextDay = () => setCurrentDate(addDays(currentDate, 1));
  const prevDay = () => setCurrentDate(subDays(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
      {/* Time Grid Area */}
      <div className="flex-1 bg-white border border-dash-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
        {/* Header Control */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dash-border bg-dash-surface">
          <div className="flex items-center gap-4">
            <h2 className="text-[18px] font-bold !text-dash-text min-w-[200px]">
              {format(currentDate, 'EEEE, MMM d, yyyy')}
            </h2>
            <div className="flex items-center bg-white rounded-lg p-1 border border-dash-border">
              <button onClick={prevDay} className="p-1.5 hover:bg-dash-surface rounded-lg !text-dash-textMuted transition-all motion-reduce:transition-none">
                <ChevronLeft size={16} />
              </button>
              <button onClick={goToToday} className="px-3 py-1 text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text transition-all motion-reduce:transition-none">
                Today
              </button>
              <button onClick={nextDay} className="p-1.5 hover:bg-dash-surface rounded-lg !text-dash-textMuted transition-all motion-reduce:transition-none">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto no-scrollbar relative flex">
          {/* Time Labels Column */}
          <div className="w-[70px] border-r border-dash-border bg-dash-surface sticky left-0 z-20">
            {hours.map(hour => (
              <div key={hour} className="h-[80px] text-[10px] font-bold !text-dash-textMuted flex items-start justify-center pt-2">
                {format(addHours(startOfDay(new Date()), hour), 'ha')}
              </div>
            ))}
          </div>

          {/* Main Day Column */}
          <div className="flex-1 relative">
            {hours.map(hour => (
              <div key={hour} className="h-[80px] border-b border-dash-border border-opacity-50" />
            ))}

            {/* Appointments Overlay */}
            {dayAppointments.map(appt => {
               const start = new Date(appt.start_time);
               const top = (start.getHours() * 80 + (start.getMinutes() / 60) * 80); // px from top
               return (
                 <div
                   key={appt.id}
                   className="absolute left-4 right-4 rounded-xl p-4 text-[13px] font-bold border border-dash-border shadow-xl overflow-hidden group hover:z-30 transition-all motion-reduce:transition-none"
                   style={{
                     top: `${top}px`,
                     minHeight: '80px',
                     backgroundColor: appt.color || 'rgba(19, 89, 255, 0.08)',
                     color: appt.text_color || '#1359FF',
                     borderLeft: `5px solid ${appt.border_color || '#1359FF'}`
                   }}
                 >
                   <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/40 text-[10px] font-bold">
                        <Clock size={12} />
                        {format(start, 'h:mm a')}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold opacity-60">Confirmed</span>
                   </div>
                   <div className="text-[16px] mb-2">{appt.title}</div>

                   <div className="flex flex-wrap items-center gap-4 opacity-70 font-medium text-[11px]">
                      {appt.contact && (
                        <div className="flex items-center gap-1">
                          <User size={12} />
                          {appt.contact.first_name} {appt.contact.last_name}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <MapPin size={12} />
                        Google Meet
                      </div>
                   </div>
                 </div>
               );
            })}

            {/* Current Time Indicator */}
            {isSameDay(currentDate, new Date()) && (
              <div
                className="absolute left-0 right-0 h-[2px] bg-red z-20 pointer-events-none"
                style={{ top: `${(new Date().getHours() * 80 + (new Date().getMinutes() / 60) * 80)}px` }}
              >
                <div className="absolute left-0 -top-[4px] w-[10px] h-[10px] bg-red rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Side Info Panel */}
      <div className="w-full lg:w-[320px] flex flex-col gap-6">
        <div className="bg-white border border-dash-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-[13px] font-bold !text-dash-text mb-4">
            Today's schedule
          </h3>
          <div className="space-y-4">
            {dayAppointments.length === 0 ? (
              <div className="text-[12px] !text-dash-textMuted italic">No appointments for today</div>
            ) : (
              dayAppointments.map(appt => (
                <div key={appt.id} className="flex gap-4 group cursor-pointer">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-dash-accent" />
                    <div className="w-px flex-1 bg-dash-border" />
                  </div>
                  <div className="pb-4">
                    <div className="text-[11px] font-bold !text-dash-textMuted mb-1">
                      {format(new Date(appt.start_time), 'h:mm a')}
                    </div>
                    <div className="text-[13px] font-bold !text-dash-text group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
                      {appt.title}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-dash-accent to-purple rounded-2xl p-6 text-white shadow-sm">
          <h3 className="text-[15px] font-bold mb-2">Waitlist active</h3>
          <p className="text-[12px] opacity-80 mb-4 leading-relaxed font-medium">
            There are 4 people waiting for a spot today. Promote them automatically if a slot opens up.
          </p>
          <button className="w-full bg-white text-dash-text py-2.5 rounded-lg text-[12px] font-bold hover:bg-white/90 transition-all motion-reduce:transition-none">
            Manage waitlist
          </button>
        </div>
      </div>
    </div>
  );
}
