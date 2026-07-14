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
    <div className="flex items-center justify-between gap-4 pt-6 border-t border-dash-border mt-8">
      {/* Back Button */}
      {!isFirstStep ? (
        <button
          type="button"
          onClick={prevStep}
          className="flex items-center gap-1.5 px-5 py-3 border border-dash-border hover:bg-dash-surface !text-dash-text rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none"
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
          className="flex items-center gap-1.5 px-8 py-3 bg-green hover:bg-green/90 text-white rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none"
        >
          Submit form <Check size={14} />
        </button>
      ) : (
        <button
          type="button"
          onClick={nextStep}
          className="flex items-center gap-1.5 px-8 py-3 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none"
        >
          Next step <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}
