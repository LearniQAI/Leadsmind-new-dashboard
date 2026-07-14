'use client';

import React from 'react';
import { useRuntimeForm } from './RuntimeStore';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  type: 'percentage' | 'numbered' | 'minimal';
}

export function ProgressBar({ type }: ProgressBarProps) {
  const { state, steps } = useRuntimeForm();
  const { currentStepIndex } = state;
  const totalSteps = steps.length;

  if (totalSteps <= 1) return null; // No need for progress indicators if only 1 step

  const progressPercent = Math.min(
    Math.round(((currentStepIndex) / (totalSteps - 1)) * 100),
    100
  );

  switch (type) {
    case 'percentage':
      return (
        <div className="w-full space-y-2 mb-6">
          <div className="flex justify-between items-center text-[10px] font-bold !text-dash-textMuted">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>{progressPercent}% complete</span>
          </div>
          <div className="w-full h-2 bg-dash-surface border border-dash-border rounded-full overflow-hidden">
            <div
              className="h-full bg-dash-accent rounded-full transition-all duration-500 ease-out motion-reduce:transition-none"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      );

    case 'numbered':
      return (
        <div className="w-full flex items-center justify-between gap-2 mb-8 relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-dash-border z-0" />
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;

            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 motion-reduce:transition-none",
                    isActive
                      ? 'bg-dash-accent text-white border-2 border-dash-accent scale-110'
                      : isCompleted
                      ? 'bg-green/10 text-green border-2 border-green/40'
                      : 'bg-dash-surface !text-dash-textMuted border border-dash-border'
                  )}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className="hidden sm:block text-[9px] font-bold !text-dash-textMuted mt-2 absolute top-8 whitespace-nowrap">
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      );

    case 'minimal':
    default:
      return (
        <div className="w-full h-1 bg-dash-border mb-6 relative overflow-hidden rounded-full">
          <div
            className="h-full bg-dash-accent transition-all duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      );
  }
}
