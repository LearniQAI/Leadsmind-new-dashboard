'use client';

import React from 'react';
import { format } from 'date-fns';
import {
  Calendar, MoreHorizontal, MessageSquare, Paperclip,
  ChevronRight, ArrowUpDown, Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { ListFilter } from 'lucide-react';
import { DashEmptyState } from '@/components/dashboard-ui';

interface TasksListViewProps {
  tasks: any[];
  onTaskClick: (taskId: string) => void;
}

const PRIORITY_COLORS = {
  low: 'text-green bg-green/10 border-green/20',
  medium: 'text-amber bg-amber/10 border-amber/20',
  high: 'text-red bg-red/10 border-red/20',
};

// Same fixed status progression as the Kanban board (KanbanColumn.tsx):
// neutral -> accent -> violet -> success green, not an arbitrary color set.
const STATUS_COLORS: Record<string, string> = {
  todo: 'text-dash-textMuted bg-dash-textMuted/[0.06]',
  in_progress: 'text-dash-accent bg-dash-accent/5',
  in_review: 'text-purple bg-purple/5',
  done: 'text-green bg-green/5',
};

export function TasksListView({ tasks, onTaskClick }: TasksListViewProps) {
  return (
    <div className="w-full px-6 pb-20 overflow-x-auto custom-scrollbar">
      <div className="min-w-[800px]">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-dash-border bg-dash-surface rounded-t-2xl">
          <div className="col-span-5 flex items-center gap-2">
            <span className="text-[10px] font-black tracking-widest !text-dash-textMuted">Task Name</span>
            <ArrowUpDown className="w-3 h-3 !text-dash-textMuted" />
          </div>
          <div className="col-span-2 text-[10px] font-black tracking-widest !text-dash-textMuted">Status</div>
          <div className="col-span-2 text-[10px] font-black tracking-widest !text-dash-textMuted">Assignees</div>
          <div className="col-span-2 text-[10px] font-black tracking-widest !text-dash-textMuted">Due Date</div>
          <div className="col-span-1"></div>
        </div>

        {/* Table Body */}
        <div className="flex flex-col gap-1 mt-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onTaskClick(task.id)}
              className="grid grid-cols-12 gap-4 px-6 py-4 bg-dash-surface hover:bg-dash-surface border border-dash-border hover:border-dash-border transition-all cursor-pointer group rounded-xl items-center"
            >
              {/* Name & Title */}
              <div className="col-span-5 flex items-center gap-4">
                <div className={cn(
                  "w-1.5 h-10 rounded-full shrink-0",
                  task.priority === 'high' ? "bg-red shadow-[0_0_10px_rgba(239,68,68,0.3)]" :
                    task.priority === 'medium' ? "bg-amber" : "bg-green"
                )} />
                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] font-bold !text-dash-text truncate group-hover:text-dash-accent transition-colors">
                    {task.title}
                  </span>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-bold !text-dash-textMuted tracking-tighter">
                      TASK-{task.id.slice(0, 4)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 !text-dash-textMuted" />
                      <span className="text-[10px] !text-dash-textMuted font-bold">{task.comment_count || 0}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <Badge variant="outline" className={cn(
                  "border-dash-border text-[9px] font-black px-2 py-0.5",
                  STATUS_COLORS[task.status]
                )}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>

              {/* Assignees */}
              <div className="col-span-2">
                <div className="flex items-center -space-x-2">
                  {task.assignees?.slice(0, 3).map((a: any, i: number) => (
                    <Avatar key={i} className="w-7 h-7 border-2 border-white shadow-lg">
                      <AvatarImage src={a.profile?.avatar_url} />
                      <AvatarFallback className="text-[8px] bg-dash-surface">
                        {a.profile?.first_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {task.assignees?.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-dash-surface border-2 border-white flex items-center justify-center text-[8px] font-bold !text-dash-textMuted">
                      +{task.assignees.length - 3}
                    </div>
                  )}
                </div>
              </div>

              {/* Due Date */}
              <div className="col-span-2 flex items-center gap-2">
                <Clock className={cn(
                  "w-3.5 h-3.5",
                  task.due_date && new Date(task.due_date) < new Date() ? "text-red" : "!text-dash-textMuted"
                )} />
                <span className={cn(
                  "text-[12px] font-bold",
                  task.due_date && new Date(task.due_date) < new Date() ? "text-red" : "!text-dash-textMuted"
                )}>
                  {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : 'No Date'}
                </span>
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end">
                <button className="p-2 rounded-lg hover:bg-dash-border/60 !text-dash-textMuted group-hover:!text-dash-textMuted transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <DashEmptyState
              icon={ListFilter}
              title="No tasks matching your filters"
              description="Try adjusting search, sort, or the personnel filter."
            />
          )}
        </div>
      </div>
    </div>
  );
}
