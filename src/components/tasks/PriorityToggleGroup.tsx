'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Zap, AlertCircle } from 'lucide-react';

interface PriorityToggleGroupProps {
  value: string;
  onChange: (value: string) => void;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', color: 'text-green', bg: 'bg-green/10', border: 'border-green/20' },
  { value: 'medium', label: 'Medium', color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20' },
  { value: 'high', label: 'High', color: 'text-red', bg: 'bg-red/10', border: 'border-red/20' },
];

export function PriorityToggleGroup({ value, onChange }: PriorityToggleGroupProps) {
  return (
    <div className="space-y-3">
      <label className="text-[12px] font-bold !text-dash-textMuted">
        Priority level
      </label>
      <div className="grid grid-cols-3 gap-3">
        {PRIORITIES.map((p) => {
          const isSelected = value === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange(p.value)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors motion-reduce:transition-none",
                isSelected
                  ? `${p.bg} ${p.border} ${p.color}`
                  : "bg-dash-surface border-dash-border !text-dash-textMuted hover:border-dash-text/20"
              )}
            >
              <span className={cn(
                "text-[12px] font-bold",
                isSelected ? p.color : "!text-dash-textMuted"
              )}>
                {p.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
