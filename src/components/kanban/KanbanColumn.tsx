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

const COLUMN_THEMES: Record<string, { border: string, bg: string, text: string, shadow: string }> = {
  todo: { 
    border: 'border-l-amber', 
    bg: 'bg-amber/5', 
    text: 'text-amber',
    shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.05)]'
  },
  in_progress: { 
    border: 'border-l-accent', 
    bg: 'bg-accent/5', 
    text: 'text-accent',
    shadow: 'shadow-[0_0_20px_rgba(37,99,235,0.05)]'
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
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.05)]'
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
          
          <div className="flex flex-col">
            <h3 className="text-sm font-black tracking-[0.1em] !text-dash-text">
              {title}
            </h3>
            <span className="text-[10px] font-bold !text-dash-textMuted tracking-widest">
              {tasks.length} {tasks.length === 1 ? 'Task' : 'Tasks'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center -space-x-2 mr-4">
             {/* Mock avatars for the row */}
             <div className="w-6 h-6 rounded-full border-2 border-white bg-dash-surface flex items-center justify-center text-[8px] font-bold !text-dash-textMuted">
                +{tasks.length}
             </div>
          </div>


          
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
                  "p-6 transition-colors duration-200",
                  snapshot.isDraggingOver ? "bg-dash-accent/5" : "bg-transparent"
                )}
              >
                {tasks.length === 0 && !snapshot.isDraggingOver ? (
                  <div className="py-8">
                    <EmptyColumnState onAddTask={() => onAddTask?.(id)} />
                  </div>
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
