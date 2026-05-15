'use client';

import React, { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, addMonths, subMonths,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface TasksCalendarViewProps {
  tasks: any[];
  onTaskClick: (taskId: string) => void;
  onDateClick: (date: Date) => void;
}

export function TasksCalendarView({ tasks, onTaskClick, onDateClick }: TasksCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-6 mb-8">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-white font-dm">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            Task Scheduling Matrix
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-white/40" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 h-10 rounded-xl bg-white/5 border border-white/5 text-[11px] font-black uppercase tracking-widest text-white/60 hover:text-white transition-all"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-white/40" />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = [];
    const date = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="py-4 text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            {date[i]}
          </span>
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-b border-white/5">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;

        // Find tasks for this day
        const dayTasks = tasks.filter(t => t.due_date && isSameDay(new Date(t.due_date), cloneDay));

        days.push(
          <div
            key={day.toString()}
            onClick={() => onDateClick(cloneDay)}
            className={cn(
              "min-h-[140px] border-r border-b border-white/5 p-3 transition-colors cursor-pointer group/cell",
              !isSameMonth(day, monthStart) ? "bg-black/20" : "bg-transparent hover:bg-white/[0.02]",
              isSameDay(day, new Date()) ? "bg-primary/5" : ""
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={cn(
                "text-[13px] font-bold transition-colors",
                !isSameMonth(day, monthStart) ? "text-white/10" : "text-white/60 group-hover/cell:text-white",
                isSameDay(day, new Date()) ? "text-primary bg-primary/10 w-7 h-7 rounded-full flex items-center justify-center" : ""
              )}>
                {formattedDate}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {dayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick(task.id);
                  }}
                  className={cn(
                    "px-2 py-1.5 rounded-lg border text-left transition-all hover:scale-105 active:scale-95 group relative",
                    task.priority === 'high' ? "bg-red/10 border-red/20 text-red" :
                      task.priority === 'medium' ? "bg-amber/10 border-amber/20 text-amber" :
                        "bg-green/10 border-green/20 text-green"
                  )}
                >
                  <p className="text-[10px] font-bold truncate leading-tight">
                    {task.title}
                  </p>
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full opacity-60",
                    task.priority === 'high' ? "bg-red" : task.priority === 'medium' ? "bg-amber" : "bg-green"
                  )} />
                </button>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="border-l border-white/5">{rows}</div>;
  };

  return (
    <div className="w-full px-6 pb-20 overflow-x-auto custom-scrollbar">
      <div className="min-w-[1000px] bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
