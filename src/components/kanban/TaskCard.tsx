'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { Calendar, MoreVertical, MessageSquare, Paperclip } from 'lucide-react';
import { format, isPast } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: any;
  index: number;
  onClick?: () => void;
}

const PRIORITY_COLORS = {
  low: 'bg-green/10 text-green border-green/20',
  medium: 'bg-amber/10 text-amber border-amber/20',
  high: 'bg-red/10 text-red border-red/20',
};

const COLUMN_COLORS: Record<string, string> = {
  todo: 'border-t-[#f59e0b]', // Amber
  in_progress: 'border-t-[#3b82f6]', // Blue
  in_review: 'border-t-[#8b5cf6]', // Purple
  done: 'border-t-[#10b981]', // Green
};

export function TaskCard({ task, index, onClick }: TaskCardProps) {
  const isOverdue = task.due_date ? isPast(new Date(task.due_date)) : false;

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "group relative flex flex-col gap-3 p-4 bg-[#0B132C]/95 border border-white/5 rounded-xl shadow-lg transition-all duration-300",
            COLUMN_COLORS[task.status] || 'border-t-white/10',
            "border-t-[3px]",
            snapshot.isDragging ? "shadow-2xl ring-2 ring-primary/20 rotate-1 z-50 scale-[1.02]" : "hover:translate-y-[-1px] hover:border-white/10",
            "hover:border-bdrh"
          )}
          style={{
            ...provided.draggableProps.style,
          }}
        >
          {/* Header */}
          <div className="flex justify-between items-start">
            <Badge 
              variant="outline" 
              className={cn(
                "text-[9px] uppercase tracking-tighter px-1.5 h-4 font-black border",
                PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS]
              )}
            >
              {task.priority}
            </Badge>
            <button className="text-white/20 hover:text-white/60 transition-colors">
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Title */}
          <h4 className="text-[12.5px] font-semibold text-white/90 leading-tight font-dm tracking-tight">
            {task.title}
          </h4>

          {/* Description Snippet (Optional but looks good) */}
          {task.description && (
            <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
            <div className="flex items-center gap-3">
              {task.due_date && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-medium",
                  isOverdue ? "text-red" : "text-white/30"
                )}>
                  <Calendar className="w-3 h-3" />
                  {format(new Date(task.due_date), 'MMM d')}
                </div>
              )}
              
              {/* Optional Meta Indicators */}
              <div className="flex items-center gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-0.5 text-[9px] text-white">
                  <MessageSquare className="w-2.5 h-2.5" />
                  2
                </div>
                <div className="flex items-center gap-0.5 text-[9px] text-white">
                  <Paperclip className="w-2.5 h-2.5" />
                  1
                </div>
              </div>
            </div>

            {/* Avatar Stack */}
            <div className="flex -space-x-2">
              {task.assignees?.slice(0, 3).map((a: any, i: number) => (
                <Avatar key={a.user_id} className="w-6 h-6 border-2 border-[#0B132C] ring-0 z-[i]">
                  <AvatarImage src={a.profile?.avatar_url} />
                  <AvatarFallback className="text-[9px] font-bold bg-primary/20 text-primary">
                    {a.profile?.first_name?.[0]}{a.profile?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
              ))}
              {task.assignees?.length > 3 && (
                <div className="w-6 h-6 rounded-full border-2 border-[#0B132C] bg-white/5 flex items-center justify-center z-10">
                  <span className="text-[8px] font-bold text-white/60">+{task.assignees.length - 3}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
