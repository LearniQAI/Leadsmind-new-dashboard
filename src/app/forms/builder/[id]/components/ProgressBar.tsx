'use client';

import React from 'react';
import { useRuntimeForm } from './RuntimeStore';

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
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#94a3c8]">
            <span>Step {currentStepIndex + 1} of {totalSteps}</span>
            <span>{progressPercent}% Complete</span>
          </div>
          <div className="w-full h-2 bg-white/5 border border-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#2563eb] rounded-full transition-all duration-500 ease-out shadow-[0_0_8px_rgba(37,99,235,0.4)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      );

    case 'numbered':
      return (
        <div className="w-full flex items-center justify-between gap-2 mb-8 relative">
          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[1px] bg-white/5 z-0" />
          {steps.map((step, idx) => {
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                    isActive
                      ? 'bg-[#2563eb] text-white border-2 border-[#2563eb] shadow-[0_0_12px_rgba(37,99,235,0.4)] scale-110'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40'
                      : 'bg-[#080f28] text-white/40 border border-white/10'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </div>
                <span className="hidden sm:block text-[9px] font-black uppercase tracking-wider text-white/40 mt-2 absolute top-8 whitespace-nowrap">
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
        <div className="w-full h-1 bg-white/3 mb-6 relative overflow-hidden">
          <div
            className="h-full bg-white/20 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      );
  }
}
