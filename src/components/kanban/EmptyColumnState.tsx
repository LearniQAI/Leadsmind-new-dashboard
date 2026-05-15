'use client';

import React from 'react';
import { Plus, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyColumnStateProps {
  onAddTask?: () => void;
}

export function EmptyColumnState({ onAddTask }: EmptyColumnStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02] transition-all duration-300">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <ClipboardList className="w-6 h-6 text-white/20" />
      </div>
      <h4 className="text-white/40 text-sm font-medium mb-1">No tasks yet</h4>
      <p className="text-white/20 text-xs mb-4 text-center">Start by adding a task to this column</p>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onAddTask}
        className="h-8 text-[10px] uppercase tracking-widest font-black text-white/40 hover:text-white hover:bg-white/5 gap-2"
      >
        <Plus className="w-3 h-3" />
        Add Task
      </Button>
    </div>
  );
}
