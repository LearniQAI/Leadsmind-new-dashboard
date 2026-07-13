'use client';

import React from 'react';
import { Tag, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DashButton } from '@/components/dashboard-ui/Button';

interface BulkActionToolbarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onAddTag: () => void;
  className?: string;
}

export function BulkActionToolbar({
  selectedCount,
  onClear,
  onDelete,
  onAddTag,
  className
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      "fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300",
      className
    )}>
      <div className="bg-white border border-dash-border rounded-2xl px-6 py-3 shadow-xl flex items-center gap-6">
        <div className="flex items-center gap-3 pr-6 border-r border-dash-border">
          <span className="bg-dash-accent text-white text-[11px] font-bold w-6 h-6 rounded-md flex items-center justify-center">
            {selectedCount}
          </span>
          <span className="text-[12px] font-bold !text-dash-text">
            Selected
          </span>
          <button
            onClick={onClear}
            className="text-[12px] font-bold text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none ml-1"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <DashButton variant="secondary" size="sm" onClick={onAddTag}>
            <Tag size={13} className="text-dash-accent" />
            Add tag
          </DashButton>

          <DashButton variant="destructive" size="sm" onClick={onDelete}>
            <Trash2 size={13} />
            Delete
          </DashButton>
        </div>
      </div>
    </div>
  );
}
