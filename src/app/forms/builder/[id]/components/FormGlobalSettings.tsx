'use client';

import React from 'react';
import { ChevronDown, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormGlobalSettingsProps {
  config: {
    autoSaveEnabled?: boolean;
    recoveryEmailEnabled?: boolean;
    sessionExpirationDays?: number;
    partialSubmissionBehavior?: string;
  };
  dispatch: (action: any) => void;
}

export function FormGlobalSettings({ config, dispatch }: FormGlobalSettingsProps) {
  return (
    <div className="builder-panel__body custom-scrollbar flex-1 overflow-y-auto flex flex-col gap-5 px-5 pb-5">

      {/* Progress Auto-Save Toggle */}
      <div
        className="flex items-center justify-between p-3 bg-white border border-dash-border rounded-xl cursor-pointer hover:bg-dash-surface transition-colors motion-reduce:transition-none"
        onClick={() => dispatch({
          type: 'UPDATE_CONFIG',
          config: { autoSaveEnabled: !(config.autoSaveEnabled ?? true) }
        })}
      >
        <div>
          <label htmlFor="form-autosave-toggle" className="text-xs font-bold !text-dash-text cursor-pointer select-none block">
            Auto-save progress
          </label>
          <span className="text-[10px] !text-dash-textMuted block mt-0.5">Saves step data in background</span>
        </div>
        <div className="relative flex items-center">
          <button
            id="form-autosave-toggle"
            type="button"
            role="switch"
            aria-checked={config.autoSaveEnabled ?? true}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out motion-reduce:transition-none focus:outline-none",
              (config.autoSaveEnabled ?? true) ? 'bg-dash-accent' : 'bg-dash-border'
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out motion-reduce:transition-none",
                (config.autoSaveEnabled ?? true) ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Expiration Timing */}
      <div>
        <label className="settings-label" htmlFor="form-session-expiration">Session expiration</label>
        <div className="relative">
          <select
            id="form-session-expiration"
            value={config.sessionExpirationDays ?? 7}
            onChange={(e) => dispatch({
              type: 'UPDATE_CONFIG',
              config: { sessionExpirationDays: parseInt(e.target.value, 10) }
            })}
            className="settings-input h-10 pl-3 pr-9 text-xs cursor-pointer appearance-none"
          >
            <option value={1}>1 Day</option>
            <option value={3}>3 Days</option>
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 !text-dash-textMuted pointer-events-none" />
        </div>
      </div>

      {/* Partial Submission Behavior */}
      <div>
        <label className="settings-label" htmlFor="form-partial-behavior">Incomplete submission policy</label>
        <div className="relative">
          <select
            id="form-partial-behavior"
            value={config.partialSubmissionBehavior ?? 'keep'}
            onChange={(e) => dispatch({
              type: 'UPDATE_CONFIG',
              config: { partialSubmissionBehavior: e.target.value }
            })}
            className="settings-input h-10 pl-3 pr-9 text-xs cursor-pointer appearance-none"
          >
            <option value="keep">Retain details on resume</option>
            <option value="overwrite">Overwrite existing progress</option>
            <option value="discard">Discard on page timeout</option>
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 !text-dash-textMuted pointer-events-none" />
        </div>
      </div>

      {/* Quick info */}
      <div className="flex items-start gap-2.5 text-[11px] !text-dash-textMuted leading-relaxed p-3.5 bg-dash-accent/5 rounded-xl border border-dash-accent/15">
        <Info size={14} className="text-dash-accent shrink-0 mt-0.5" />
        <span>Select any field on the canvas to configure that specific input, or customize form behaviors here.</span>
      </div>

    </div>
  );
}
