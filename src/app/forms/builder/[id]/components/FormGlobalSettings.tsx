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
    <div className="builder-panel__body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, padding: '0 20px 20px' }}>
      
      {/* Progress Auto-Save Toggle */}
      <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl">
        <div>
          <label htmlFor="form-autosave-toggle" className="text-xs font-bold text-white/80 font-dm-sans cursor-pointer select-none block">
            Auto-Save Progress
          </label>
          <span className="text-[9px] text-[#4a5a82] block font-dm-sans mt-0.5">Saves step data in background</span>
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
            className="w-9 h-5 rounded-full border border-white/10 bg-white/5 checked:bg-[#2563eb] checked:border-transparent focus:outline-none transition-all appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:rounded-full before:bg-white/40 before:top-0.5 before:left-0.5 checked:before:left-4.5 checked:before:bg-white before:transition-all"
          />
        </div>
      </div>

      {/* Recovery Email Toggle */}
      <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl">
        <div>
          <label htmlFor="form-recovery-toggle" className="text-xs font-bold text-white/80 font-dm-sans cursor-pointer select-none block">
            Recovery Emails
          </label>
          <span className="text-[9px] text-[#4a5a82] block font-dm-sans mt-0.5">Allows resuming via emailed links</span>
        </div>
        <div className="relative flex items-center">
          <input
            id="form-recovery-toggle"
            type="checkbox"
            checked={config.recoveryEmailEnabled ?? false}
            onChange={(e) => dispatch({
              type: 'UPDATE_CONFIG',
              config: { recoveryEmailEnabled: e.target.checked }
            })}
            className="w-9 h-5 rounded-full border border-white/10 bg-white/5 checked:bg-[#2563eb] checked:border-transparent focus:outline-none transition-all appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:rounded-full before:bg-white/40 before:top-0.5 before:left-0.5 checked:before:left-4.5 checked:before:bg-white before:transition-all"
          />
        </div>
      </div>

      {/* Expiration Timing */}
      <div>
        <label className="settings-label" htmlFor="form-session-expiration">Session Expiration</label>
        <select
          id="form-session-expiration"
          value={config.sessionExpirationDays ?? 7}
          onChange={(e) => dispatch({
            type: 'UPDATE_CONFIG',
            config: { sessionExpirationDays: parseInt(e.target.value, 10) }
          })}
          className="settings-input w-full h-10 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs focus:outline-none cursor-pointer"
        >
          <option value={1} className="bg-[#0b132c] text-white">1 Day</option>
          <option value={3} className="bg-[#0b132c] text-white">3 Days</option>
          <option value={7} className="bg-[#0b132c] text-white">7 Days</option>
          <option value={14} className="bg-[#0b132c] text-white">14 Days</option>
          <option value={30} className="bg-[#0b132c] text-white">30 Days</option>
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
          className="settings-input w-full h-10 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs focus:outline-none cursor-pointer"
        >
          <option value="keep" className="bg-[#0b132c] text-white">Retain details on resume</option>
          <option value="overwrite" className="bg-[#0b132c] text-white">Overwrite existing progress</option>
          <option value="discard" className="bg-[#0b132c] text-white">Discard on page timeout</option>
        </select>
      </div>

      {/* Quick info */}
      <div className="text-[10px] text-[#4a5a82] leading-relaxed p-4 bg-white/1 rounded-xl border border-white/5 font-dm-sans">
        Select any field on the canvas to configure that specific input, or customize form behaviors here.
      </div>

    </div>
  );
}
