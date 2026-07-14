'use client';

import React from 'react';

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
      <div className="flex items-center justify-between p-3 bg-white border border-dash-border rounded-xl">
        <div>
          <label htmlFor="form-autosave-toggle" className="text-xs font-bold !text-dash-text cursor-pointer select-none block">
            Auto-save progress
          </label>
          <span className="text-[10px] !text-dash-textMuted block mt-0.5">Saves step data in background</span>
        </div>
        <div className="relative flex items-center">
          <input
            id="form-autosave-toggle"
            type="checkbox"
            checked={config.autoSaveEnabled ?? true}
            onChange={(e) => dispatch({
              type: 'UPDATE_CONFIG',
              config: { autoSaveEnabled: e.target.checked }
            })}
            className="w-9 h-5 rounded-full border border-dash-border bg-dash-surface checked:bg-dash-accent checked:border-transparent focus:outline-none transition-colors motion-reduce:transition-none appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:rounded-full before:bg-white before:top-0.5 before:left-0.5 checked:before:left-4.5 before:transition-all motion-reduce:before:transition-none before:shadow-sm"
          />
        </div>
      </div>

      {/* Expiration Timing */}
      <div>
        <label className="settings-label" htmlFor="form-session-expiration">Session expiration</label>
        <select
          id="form-session-expiration"
          value={config.sessionExpirationDays ?? 7}
          onChange={(e) => dispatch({
            type: 'UPDATE_CONFIG',
            config: { sessionExpirationDays: parseInt(e.target.value, 10) }
          })}
          className="settings-input h-10 px-3 text-xs cursor-pointer"
        >
          <option value={1}>1 Day</option>
          <option value={3}>3 Days</option>
          <option value={7}>7 Days</option>
          <option value={14}>14 Days</option>
          <option value={30}>30 Days</option>
        </select>
      </div>

      {/* Partial Submission Behavior */}
      <div>
        <label className="settings-label" htmlFor="form-partial-behavior">Incomplete submission policy</label>
        <select
          id="form-partial-behavior"
          value={config.partialSubmissionBehavior ?? 'keep'}
          onChange={(e) => dispatch({
            type: 'UPDATE_CONFIG',
            config: { partialSubmissionBehavior: e.target.value }
          })}
          className="settings-input h-10 px-3 text-xs cursor-pointer"
        >
          <option value="keep">Retain details on resume</option>
          <option value="overwrite">Overwrite existing progress</option>
          <option value="discard">Discard on page timeout</option>
        </select>
      </div>

      {/* Quick info */}
      <div className="text-[11px] !text-dash-textMuted leading-relaxed p-4 bg-dash-surface rounded-xl border border-dash-border">
        Select any field on the canvas to configure that specific input, or customize form behaviors here.
      </div>

    </div>
  );
}
