"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  STEP_TYPE_META, BUSINESS_GOAL_ORDER, getStepTypesByBusinessGoal, type StepType
} from '@/lib/builder/stepTypes';

// Phase 1 (the spine) wired up opt_in / sales_page / order_form; Phase 2 (the
// priority trio) added upsell / downsell / thank_you; Phase 3 adds
// info_page / webinar_registration / webinar_thank_you / inline_popup_form.
// opt_in_thank_you remains the one type without dedicated logic/template yet.
const ENABLED_STEP_TYPES: StepType[] = [
  'opt_in', 'sales_page', 'order_form', 'upsell', 'downsell', 'thank_you',
  'info_page', 'webinar_registration', 'webinar_thank_you', 'inline_popup_form',
];

interface AddStepModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (stepType: StepType) => void;
}

export const AddStepModal = ({ isOpen, onOpenChange, onPick }: AddStepModalProps) => {
  const grouped = getStepTypesByBusinessGoal();

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white border-slate-200 text-slate-900 rounded-3xl p-0 overflow-hidden shadow-2xl z-[9999]">
        <div className="flex flex-col max-h-[80vh]">
          <DialogHeader className="p-6 pb-4 border-b border-slate-200">
            <DialogTitle className="text-xl font-bold text-slate-900">Add a step</DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-1">
              Grouped by business goal — pick what this step is for.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-7">
            {BUSINESS_GOAL_ORDER.map((goal) => (
              <section key={goal}>
                <h3 className="text-[13px] font-bold text-slate-900 mb-3">{goal}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {grouped[goal].map((stepType) => {
                    const meta = STEP_TYPE_META[stepType];
                    const Icon = meta.icon;
                    const enabled = ENABLED_STEP_TYPES.includes(stepType);
                    return (
                      <button
                        key={stepType}
                        disabled={!enabled}
                        onClick={() => enabled && onPick(stepType)}
                        className={cn(
                          "relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-center transition-all duration-150 motion-reduce:transition-none",
                          enabled
                            ? "border-transparent bg-slate-100 hover:bg-slate-200 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 cursor-pointer"
                            : "border-transparent bg-slate-50 opacity-50 cursor-not-allowed"
                        )}
                      >
                        {!enabled && (
                          <div className="absolute top-2 right-2 text-slate-400">
                            <Lock className="w-3 h-3" />
                          </div>
                        )}
                        <div className={cn(
                          "h-9 w-9 rounded-xl flex items-center justify-center",
                          enabled ? "bg-white text-slate-700" : "bg-slate-100 text-slate-400"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[11px] font-bold leading-tight text-slate-900">{meta.label}</span>
                        {!enabled && (
                          <span className="text-[9px] font-semibold text-slate-500">Coming soon</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
