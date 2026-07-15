'use client';

import React from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyColumnStateProps {
  onAddTask?: () => void;
}

export function EmptyColumnState({ onAddTask }: EmptyColumnStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-6 border border-dashed border-dash-border rounded-2xl bg-white/60 transition-all duration-300 motion-reduce:transition-none">
      <div className="w-11 h-11 rounded-2xl bg-dash-surface flex items-center justify-center mb-3">
        <ClipboardList className="w-5 h-5 !text-dash-textMuted" />
      </div>
      <h4 className="!text-dash-text text-[13px] font-bold mb-1">No tasks yet</h4>
      <p className="!text-dash-textMuted text-xs mb-3 text-center">Start by adding a task to this column</p>
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
