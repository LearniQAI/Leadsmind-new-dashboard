"use client";

import React from 'react';
import { useNode } from '@craftjs/core';
import { Progress } from '@/components/ui/progress';

export interface ProgressBarProps {
  value: number;
  color: string;
  height: number;
  showLabel: boolean;
  label: string;
  borderRadius: number;
}

export const ProgressBar = ({ value, color, height, showLabel, label, borderRadius, dragRef, ...props }: ProgressBarProps & any) => {
  const { connectors: { connect, drag } } = useNode();
  
  return (
    <div
      {...props}
      ref={(ref) => {
        if (ref) {
            connect(ref);
            drag(ref);
            if (dragRef) {
                if (typeof dragRef === 'function') dragRef(ref);
                else dragRef.current = ref;
            }
        }
      }}
      className={`w-full py-4 outline-dashed outline-1 outline-transparent hover:outline-blue-500/50 transition-all`}
    >
        {showLabel && (
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-muted-foreground uppercase">{label}</span>
                <span className="text-xs font-mono font-bold text-primary">{value}%</span>
            </div>
        )}
        <div 
            className="w-full bg-muted overflow-hidden relative" 
            style={{ height: `${height}px`, borderRadius: `${borderRadius}px` }}
        >
            <div 
                className="h-full transition-all duration-500 ease-out"
                style={{ 
                    width: `${value}%`, 
                    backgroundColor: color,
                    borderRadius: `${borderRadius}px`
                }}
            />
        </div>
    </div>
  );
};

import { ProgressBarSettings } from './ProgressBarSettings';

ProgressBar.craft = {
  displayName: 'Progress Bar',
  props: {
    value: 65,
    color: '#6c47ff',
    height: 12,
    showLabel: true,
    label: 'Step 1 of 3',
    borderRadius: 99,
  },
  related: {
    settings: ProgressBarSettings,
  },
  rules: {
    canDrag: () => true,
  },
};
