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
          <h2 className="text-2xl font-bold !text-dash-text">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <span className="text-[10px] font-black tracking-[0.2em] !text-dash-textMuted">
            Task Scheduling Matrix
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dash-surface border border-dash-border hover:bg-dash-border/60 transition-all"
          >
            <ChevronLeft className="w-5 h-5 !text-dash-textMuted" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 h-10 rounded-xl bg-dash-surface border border-dash-border text-[11px] font-black tracking-widest !text-dash-textMuted hover:!text-dash-text transition-all"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dash-surface border border-dash-border hover:bg-dash-border/60 transition-all"
          >
            <ChevronRight className="w-5 h-5 !text-dash-textMuted" />
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
          <span className="text-[10px] font-black tracking-[0.2em] !text-dash-textMuted">
            {date[i]}
          </span>
        </div>
      );
    }
    return <div className="grid grid-cols-7 border-b border-dash-border">{days}</div>;
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
              "min-h-[140px] border-r border-b border-dash-border p-3 transition-colors cursor-pointer group/cell",
              !isSameMonth(day, monthStart) ? "bg-dash-surface" : "bg-transparent hover:bg-dash-surface",
              isSameDay(day, new Date()) ? "bg-dash-accent/5" : ""
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <span className={cn(
                "text-[13px] font-bold transition-colors",
                !isSameMonth(day, monthStart) ? "!text-dash-textMuted" : "!text-dash-textMuted group-hover/cell:!text-dash-text",
                isSameDay(day, new Date()) ? "text-dash-accent bg-dash-accent/10 w-7 h-7 rounded-full flex items-center justify-center" : ""
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
                    "px-2 py-1.5 rounded-lg border text-left transition-all motion-reduce:transition-none motion-reduce:hover:scale-100 hover:scale-105 active:scale-95 group relative",
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
    return <div className="border-l border-dash-border">{rows}</div>;
  };

  return (
    <div className="w-full px-6 pb-20 overflow-x-auto custom-scrollbar">
      <div className="min-w-[1000px] bg-dash-surface border border-dash-border rounded-3xl overflow-hidden shadow-2xl">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
      </div>
    </div>
  );
}
