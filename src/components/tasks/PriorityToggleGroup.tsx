'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Shield, Zap, AlertCircle } from 'lucide-react';

interface PriorityToggleGroupProps {
  value: string;
  onChange: (value: string) => void;
}

const PRIORITIES = [
  { value: 'low', label: 'LOW', color: 'text-green', bg: 'bg-green/10', border: 'border-green/20' },
  { value: 'medium', label: 'MEDIUM', color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/20' },
  { value: 'high', label: 'HIGH', color: 'text-red', bg: 'bg-red/10', border: 'border-red/20' },
];

export function PriorityToggleGroup({ value, onChange }: PriorityToggleGroupProps) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-bold uppercase tracking-[0.6px] text-[#4a5a82] font-dm-sans">
        PRIORITY LEVEL
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
                "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-300 font-dm-sans",
                isSelected 
                  ? `${p.bg} ${p.border} ${p.color} shadow-[0_0_15px_rgba(37,99,235,0.1)]` 
                  : "bg-white/[0.02] border-white/5 text-white/20 hover:border-white/10"
              )}
            >
              <span className={cn(
                "text-[9px] font-black tracking-widest",
                isSelected ? p.color : "text-white/20"
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
