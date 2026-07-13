'use client';

import React from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyColumnStateProps {
  onAddTask?: () => void;
}

export function EmptyColumnState({ onAddTask }: EmptyColumnStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-dash-border rounded-2xl bg-dash-surface transition-all duration-300">
      <div className="w-12 h-12 rounded-full bg-dash-surface flex items-center justify-center mb-4">
        <ClipboardList className="w-6 h-6 !text-dash-textMuted" />
      </div>
      <h4 className="!text-dash-textMuted text-sm font-medium mb-1">No tasks yet</h4>
      <p className="!text-dash-textMuted text-xs mb-4 text-center">Start by adding a task to this column</p>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onAddTask}
        className="h-8 text-[10px] tracking-widest font-black !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface gap-2"
      >
        <Plus className="w-3 h-3" />
        Add Task
      </Button>
    </div>
  );
}
