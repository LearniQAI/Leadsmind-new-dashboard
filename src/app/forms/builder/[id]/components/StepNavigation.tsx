'use client';

import React from 'react';
import { useRuntimeForm } from './RuntimeStore';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

export function StepNavigation() {
  const { state, nextStep, prevStep, submitForm, steps } = useRuntimeForm();
  const { currentStepIndex, navHistory } = state;
  const isFirstStep = navHistory.length === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  return (
    <div className="flex items-center justify-between gap-4 pt-6 border-t border-white/5 mt-8">
      {/* Back Button */}
      {!isFirstStep ? (
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center gap-1.5 px-5 py-3 border border-white/10 hover:bg-white/5 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
        >
          <ChevronLeft size={14} /> Back
        </button>
      ) : (
        <div /> // Spacer to preserve alignment
      )}

      {/* Next or Submit Button */}
      {isLastStep ? (
        <button
          type="button"
          onClick={submitForm}
          className="flex items-center gap-1.5 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/15"
        >
          Submit Form <Check size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={nextStep}
          className="flex items-center gap-1.5 px-8 py-3 bg-[#2563eb] hover:bg-[#2563eb]/90 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-blue-600/15"
        >
          Next Step <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
