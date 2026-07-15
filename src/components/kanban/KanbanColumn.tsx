'use client';

import React, { useState } from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, ChevronDown, MoreHorizontal, LayoutGrid } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { EmptyColumnState } from './EmptyColumnState';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  tasks: any[];
  onAddTask?: (status: string) => void;
  onCardClick?: (taskId: string) => void;
}

// Deliberate status progression rather than an arbitrary color-per-column:
// not-started reads neutral gray, active work reads dash-accent blue, review
// reads violet (one step "hotter"), and done always reads success green —
// mirrors the same fixed-progression convention used for pipeline stages.
const COLUMN_THEMES: Record<string, { border: string, bg: string, text: string, shadow: string }> = {
  todo: {
    border: 'border-l-dash-textMuted/50',
    bg: 'bg-dash-textMuted/[0.06]',
    text: 'text-dash-textMuted',
    shadow: 'shadow-[0_0_20px_rgba(71,85,105,0.05)]'
  },
  in_progress: {
    border: 'border-l-dash-accent',
    bg: 'bg-dash-accent/5',
    text: 'text-dash-accent',
    shadow: 'shadow-[0_0_20px_rgba(19,89,255,0.06)]'
  },
  in_review: {
    border: 'border-l-purple',
    bg: 'bg-purple/5',
    text: 'text-purple',
    shadow: 'shadow-[0_0_20px_rgba(139,92,246,0.05)]'
  },
  done: {
    border: 'border-l-green',
    bg: 'bg-green/5',
    text: 'text-green',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.06)]'
  },
};

export function KanbanColumn({ id, title, tasks, onAddTask, onCardClick }: KanbanColumnProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const theme = COLUMN_THEMES[id] || COLUMN_THEMES.todo;

  return (
    <div className={cn(
      "flex flex-col w-full rounded-2xl border border-dash-border overflow-hidden transition-all duration-300",
      theme.shadow,
      isExpanded ? "bg-dash-surface" : "bg-transparent"
    )}>
      {/* Accordion Header */}
      <div 
        className={cn(
          "flex items-center justify-between py-4 px-6 cursor-pointer select-none border-l-4 transition-all",
          theme.border,
          isExpanded ? "bg-dash-surface" : "hover:bg-dash-surface"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-300",
            isExpanded ? "rotate-0" : "-rotate-90",
            theme.bg,
            theme.text
          )}>
            <ChevronDown className="w-4 h-4" />
          </div>
          
          <div className="flex items-center gap-2.5">
            <h3 className="text-sm font-black tracking-[0.1em] !text-dash-text">
              {title}
            </h3>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", theme.bg, theme.text)}>
              {tasks.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={(e) => e.stopPropagation()}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dash-surface !text-dash-textMuted hover:!text-dash-textMuted transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Accordion Content */}
      <div className={cn(
        "grid transition-all duration-500 ease-in-out",
        isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      )}>
        <div className="overflow-hidden">
          <Droppable droppableId={id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn(
                  "p-6 transition-colors duration-200 motion-reduce:transition-none",
                  snapshot.isDraggingOver ? "bg-dash-accent/5" : "bg-transparent"
                )}
              >
                {tasks.length === 0 && !snapshot.isDraggingOver ? (
                  <EmptyColumnState onAddTask={() => onAddTask?.(id)} />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {tasks.map((task, index) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        index={index} 
                        onClick={() => onCardClick?.(task.id)} 
                      />
                    ))}
                  </div>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </div>
    </div>
  );
}
