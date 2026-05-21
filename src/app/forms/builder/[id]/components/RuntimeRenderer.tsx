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
      <div className="flex flex-col items-center justify-center text-center py-16 px-6 bg-[#0c1535] border border-white/5 rounded-3xl max-w-lg mx-auto shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 animate-pulse" />
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
          <CheckCircle2 size={32} className="text-emerald-500 animate-bounce" />
        </div>
        <h3 className="text-2xl font-black uppercase text-white tracking-widest font-space-grotesk">Submission Received</h3>
        <p className="text-white/40 text-xs font-bold mt-2 uppercase tracking-widest max-w-sm leading-relaxed">
          Thank you for your responses. Your submission has been captured securely.
        </p>
      </div>
    );
  }

  if (!currentStep) {
    return (
      <div className="text-center py-12">
        <p className="text-xs text-white/30 font-dm-sans">Form contains no steps configured.</p>
      </div>
    );
  }

  // If current step is skipped by conditional logic, show a notice
  if (skipStepIds.has(currentStep.id)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-[#0c1535]/80 border border-white/5 rounded-3xl max-w-lg mx-auto shadow-xl">
        <div className="w-12 h-12 bg-[#2563eb]/10 rounded-full flex items-center justify-center mb-4 border border-[#2563eb]/20 text-[#2563eb]">
          <SkipForward size={20} />
        </div>
        <h3 className="text-lg font-black uppercase text-white tracking-widest font-space-grotesk">Step Skipped</h3>
        <p className="text-[#94a3c8] text-xs font-dm-sans mt-2 max-w-xs leading-relaxed">
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
      <div className="flex flex-col items-center justify-center text-center py-12 px-6 bg-[#0c1535]/80 border border-white/5 rounded-3xl max-w-lg mx-auto shadow-xl">
        <div className="w-12 h-12 bg-[#2563eb]/10 rounded-full flex items-center justify-center mb-4 border border-[#2563eb]/20 text-[#2563eb]">
          <MessageSquare size={20} />
        </div>
        <h3 className="text-lg font-black uppercase text-white tracking-widest font-space-grotesk">
          {currentStep.title || 'Ready to Submit'}
        </h3>
        <p className="text-[#94a3c8] text-xs font-dm-sans mt-2 max-w-xs leading-relaxed">
          {currentStep.description || 'You have filled out all sections. Click submit below to finish.'}
        </p>
        <div className="w-full">
          <StepNavigation />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0c1535]/50 border border-white/5 rounded-3xl p-6 md:p-8 shadow-xl">
      {/* Step Header */}
      <div className="mb-6">
        <h2 className="text-xl font-black uppercase tracking-tight text-white font-space-grotesk">
          {currentStep.title || 'Untitled Step'}
        </h2>
        {currentStep.description && (
          <p className="text-xs text-[#94a3c8] font-dm-sans mt-1">
            {currentStep.description}
          </p>
        )}
      </div>

      {/* Progress visualizer */}
      <ProgressBar type={progressBarType} />

      {/* Grid of interactive fields */}
      <form onSubmit={(e) => e.preventDefault()} className="grid grid-cols-2 gap-5 mt-6">
        {stepFields.length === 0 ? (
          <div className="col-span-2 py-8 text-center border border-dashed border-white/5 rounded-2xl bg-white/1">
            <p className="text-xs text-white/20 font-dm-sans">This step does not contain any fields yet.</p>
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
