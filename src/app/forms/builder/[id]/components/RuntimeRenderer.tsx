'use client';

import React from 'react';
import { useRuntimeForm } from './RuntimeStore';
import { ProgressBar } from './ProgressBar';
import { StepNavigation } from './StepNavigation';
import { RuntimeField } from './RuntimeField';
import { CheckCircle2, MessageSquare, SkipForward } from 'lucide-react';

interface RuntimeRendererProps {
  progressBarType: 'percentage' | 'numbered' | 'minimal';
}

export function RuntimeRenderer({ progressBarType }: RuntimeRendererProps) {
  const { state, steps, fields } = useRuntimeForm();
  const { currentStepIndex, completed, skipStepIds } = state;

  const currentStep = steps[currentStepIndex];

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-dash-border rounded-3xl max-w-lg mx-auto shadow-md relative overflow-hidden">
        <div className="w-16 h-16 bg-green/10 rounded-full flex items-center justify-center mb-6 border border-green/20">
          <CheckCircle2 size={32} className="text-green" />
        </div>
        <h3 className="text-2xl font-bold !text-dash-text">Submission received</h3>
        <p className="!text-dash-textMuted text-xs font-semibold mt-2 max-w-sm leading-relaxed">
          Thank you for your responses. Your submission has been captured securely.
        </p>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="text-center py-12">
        <p className="text-xs !text-dash-textMuted">Form contains no steps configured.</p>
      </div>
    );
  }

  // If current step is skipped by conditional logic, show a notice
  if (skipStepIds.has(currentStep.id)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-dash-border rounded-3xl max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 bg-dash-accent/10 rounded-full flex items-center justify-center mb-4 border border-dash-accent/20 text-dash-accent">
          <SkipForward size={20} />
        </div>
        <h3 className="text-lg font-bold !text-dash-text">Step skipped</h3>
        <p className="!text-dash-textMuted text-xs mt-2 max-w-xs leading-relaxed">
          This step is not needed based on your previous answers and has been skipped automatically.
        </p>
        <StepNavigation />
      </div>
    );
  }

  // Get only fields assigned to this specific step
  const stepFields = fields.filter(f => f.stepId === currentStep.id);

  // If completion step type, render layout
  if (currentStep.type === 'completion') {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-white border border-dash-border rounded-3xl max-w-lg mx-auto shadow-sm">
        <div className="w-12 h-12 bg-dash-accent/10 rounded-full flex items-center justify-center mb-4 border border-dash-accent/20 text-dash-accent">
          <MessageSquare size={20} />
        </div>
        <h3 className="text-lg font-bold !text-dash-text">
          {currentStep.title || 'Ready to submit'}
        </h3>
        <p className="!text-dash-textMuted text-xs mt-2 max-w-xs leading-relaxed">
          {currentStep.description || 'You have filled out all sections. Click submit below to finish.'}
        </p>
        <div className="w-full">
          <StepNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-dash-border rounded-3xl p-6 md:p-8 shadow-sm">
      {/* Step Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold !text-dash-text">
          {currentStep.title || 'Untitled Step'}
        </h2>
        {currentStep.description && (
          <p className="text-xs !text-dash-textMuted mt-1">
            {currentStep.description}
          </p>
        )}
      </div>

      {/* Progress visualizer */}
      <ProgressBar type={progressBarType} />

      {/* Grid of interactive fields */}
      <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 gap-5 mt-6">
        {stepFields.length === 0 ? (
          <div className="col-span-2 py-8 text-center border border-dashed border-dash-border rounded-2xl bg-dash-surface">
            <p className="text-xs !text-dash-textMuted">This step does not contain any fields yet.</p>
          </div>
        ) : (
          stepFields.map((field) => (
            <RuntimeField key={field.id} field={field} />
          ))
        )}
      </form>

      {/* Navigation Buttons */}
      <StepNavigation />
    </div>
  );
}
