'use client';

import React, { useState, useEffect } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { ArrowLeft, Loader2, Play, Check, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function BuilderTopbar() {
  const router = useRouter();
  const { state, dispatch, saveForm } = useFormBuilder();
  const [relativeSavedTime, setRelativeSavedTime] = useState('All changes saved');

  // Relative saved time calculator
  useEffect(() => {
    if (!state.lastSaved) {
      setRelativeSavedTime('Unsaved draft');
      return;
    }

    const updateTime = () => {
      if (state.hasUnsavedChanges) {
        setRelativeSavedTime('Unsaved changes');
        return;
      }
      const diffSec = Math.floor((Date.now() - state.lastSaved!.getTime()) / 1000);
      if (diffSec < 5) {
        setRelativeSavedTime('All changes saved');
      } else if (diffSec < 60) {
        setRelativeSavedTime(`Saved ${diffSec}s ago`);
      } else {
        const diffMin = Math.floor(diffSec / 60);
        setRelativeSavedTime(`Saved ${diffMin}m ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 3000);
    return () => clearInterval(interval);
  }, [state.lastSaved, state.hasUnsavedChanges]);

  return (
    <div className="relative z-10 shrink-0 flex items-center justify-between px-6 h-16 bg-dash-surface border-b border-dash-border">

      {/* Left Side: Navigation & Name */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/forms')}
          className="p-2 bg-white border border-dash-border rounded-lg !text-dash-text hover:bg-dash-border/40 transition-colors motion-reduce:transition-none"
          title="Back to Forms"
        >
          <ArrowLeft size={16} />
        </button>

        <div className="flex flex-col gap-0.5">
          <input
            type="text"
            value={state.formName}
            onChange={(e) => dispatch({ type: 'UPDATE_FORM_NAME', name: e.target.value })}
            className="bg-transparent border-none !text-dash-text text-sm font-bold focus:outline-none focus:ring-0 placeholder:!text-dash-textMuted p-0 h-6 w-[220px]"
            placeholder="Name your form..."
          />
          <div className="flex items-center gap-1.5">
            {state.hasUnsavedChanges ? (
              <AlertCircle size={10} className="text-amber-500 animate-pulse motion-reduce:animate-none" />
            ) : (
              <Check size={10} className="text-green" />
            )}
            <span className="text-[10px] font-bold !text-dash-textMuted">
              {relativeSavedTime}
            </span>
          </div>
        </div>
      </div>

      {/* Right Side: Actions */}
      <div className="flex gap-2.5">
        <button
          onClick={() => dispatch({ type: 'SET_MODE', mode: 'preview' })}
          disabled={state.fields.length === 0}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-lg bg-white border border-dash-border !text-dash-text disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
        >
          <Play size={12} /> Preview
        </button>

        <button
          onClick={saveForm}
          disabled={state.isSaving || !state.hasUnsavedChanges}
          className={`flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-lg border transition-colors motion-reduce:transition-none disabled:cursor-not-allowed ${
            state.hasUnsavedChanges
              ? 'bg-dash-accent/10 border-dash-accent/30 text-dash-accent'
              : 'bg-dash-surface border-dash-border !text-dash-textMuted'
          }`}
        >
          {state.isSaving ? (
            <>
              <Loader2 size={12} className="animate-spin motion-reduce:animate-none" /> Saving...
            </>
          ) : (
            'Save draft'
          )}
        </button>

        <button
          onClick={() => {
            if (state.formId) {
              router.push(`/forms/${state.formId}/automations`);
            }
          }}
          disabled={!state.formId}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-lg bg-white border border-dash-border !text-dash-text disabled:opacity-40 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
        >
          Automations
        </button>

        <button
          onClick={() => {
            if (state.formId) {
              router.push(`/forms/${state.formId}/governance`);
            }
          }}
          disabled={!state.formId}
          className="flex items-center gap-2 px-4 py-2 text-[11px] font-bold rounded-lg bg-dash-accent text-white border-none disabled:opacity-40 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none"
        >
          Publish
        </button>
      </div>
    </div>
  );
}
