'use client';

import React, { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, User, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarClientProps {
  appointments: any[];
  calendars: any[];
}

export function CalendarClient({ appointments, calendars }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="card__wrapper shadow-xl border border-white/5 bg-white overflow-hidden">
      {/* Calendar Header */}
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
            <CalendarDays className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-heading uppercase tracking-tight">
              {format(currentDate, 'MMMM')} <span className="text-primary">{format(currentDate, 'yyyy')}</span>
            </h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              {appointments.length} Total Appointments Scheduled
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-none hover:bg-gray-50 h-10 w-10">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 px-4 flex items-center justify-center font-bold text-xs uppercase text-gray-500 border-x border-gray-200 bg-gray-50">
              Today
            </div>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-none hover:bg-gray-50 h-10 w-10">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button className="btn-primary h-10 px-6 rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4 mr-2" /> New Event
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {daysOfWeek.map(day => (
            <div key={day} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, i) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());
            
            // Get appointments for this day
            const dayAppointments = appointments.filter(apt => 
              apt.start_time && isSameDay(new Date(apt.start_time), day)
            );

            return (
              <div 
                key={i} 
                className={`min-h-[120px] p-2 rounded-xl border transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer flex flex-col gap-1
                  ${!isCurrentMonth ? 'bg-gray-50/50 border-gray-100 opacity-50' : 'bg-white border-gray-200'}
                  ${isToday ? 'ring-2 ring-primary ring-offset-2 border-primary bg-primary/5' : ''}
                `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-sm font-bold ${isToday ? 'text-primary bg-white px-2 py-0.5 rounded-md shadow-sm' : 'text-gray-500'}`}>
                    {format(day, 'd')}
                  </span>
                  {dayAppointments.length > 0 && (
                    <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none text-[9px] px-1.5 h-4">
                      {dayAppointments.length}
                    </Badge>
                  )}
                </div>

                {/* Events list for the day */}
                <div className="flex-1 flex flex-col gap-1 overflow-y-auto no-scrollbar">
                  {dayAppointments.slice(0, 3).map((apt, idx) => (
                    <div 
                      key={idx} 
                      className="px-2 py-1.5 bg-gray-50 border border-gray-100 rounded-md text-[10px] group hover:bg-primary/5 hover:border-primary/20 transition-colors"
                    >
                      <div className="font-bold text-gray-700 group-hover:text-primary truncate">
                        {apt.contact?.first_name || 'Meeting'} {apt.contact?.last_name || ''}
                      </div>
                      <div className="flex items-center gap-1 text-gray-400 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        <span>{format(new Date(apt.start_time), 'h:mm a')}</span>
                      </div>
                    </div>
                  ))}
                  {dayAppointments.length > 3 && (
                    <div className="text-[9px] text-center font-bold text-gray-400 hover:text-primary mt-1">
                      +{dayAppointments.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
