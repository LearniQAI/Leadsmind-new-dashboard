'use client';

import React from 'react';
import { BuilderSidebar } from './BuilderSidebar';
import { BuilderCanvas } from './BuilderCanvas';
import { BuilderSettings } from './BuilderSettings';
import { BuilderTopbar } from './BuilderTopbar';
import { useFormBuilder } from './FormBuilderContext';
import { RuntimeProvider } from './RuntimeStore';
import { RuntimeRenderer } from './RuntimeRenderer';
import { ActiveRuleIndicator } from './LogicPreviewRenderer';
import { CollabPresenceList } from '@/app/forms/[id]/realtime/components/CollabPresenceList';
import { ConflictWarnings } from '@/app/forms/[id]/realtime/components/ConflictWarnings';
import { RealtimeNotificationHandler } from '@/app/forms/[id]/realtime/components/RealtimeNotificationHandler';
import { cn } from '@/lib/utils';

export function BuilderLayout() {
  const { state, dispatch } = useFormBuilder();

  if (state.mode === 'preview') {
    return (
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
        {/* Preview Header Control Bar */}
        <div className="h-14 px-6 flex items-center justify-between border-b border-dash-border bg-dash-surface">
          <div className="flex items-center gap-4">
            <button
              onClick={() => dispatch({ type: 'SET_MODE', mode: 'builder' })}
              className="px-4 py-2 text-[11px] font-bold rounded-lg bg-white border border-dash-border !text-dash-text transition-colors motion-reduce:transition-none"
            >
              ← Back to editor
            </button>
            <span className="text-[11px] font-bold !text-dash-textMuted">
              Interactive form preview
            </span>
          </div>

          <div className="flex gap-1 p-1 bg-white border border-dash-border rounded-xl">
            <button
              onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', device: 'desktop' })}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
                state.previewDevice === 'desktop'
                  ? 'bg-dash-accent text-white'
                  : '!text-dash-textMuted hover:!text-dash-text'
              )}
            >
              Desktop view
            </button>
            <button
              onClick={() => dispatch({ type: 'SET_PREVIEW_DEVICE', device: 'mobile' })}
              className={cn(
                "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
                state.previewDevice === 'mobile'
                  ? 'bg-dash-accent text-white'
                  : '!text-dash-textMuted hover:!text-dash-text'
              )}
            >
              Mobile view
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center overflow-hidden p-6 bg-dash-surface">
          {state.previewDevice === 'mobile' ? (
            // Simulated phone bezel — intentionally kept as a dark device-frame mockup
            // (matches the physical hardware it represents), not dashboard chrome.
            <div
              className="w-[375px] h-full max-h-[700px] bg-[#040819] border-[12px] border-[#161e38] rounded-[40px] overflow-hidden shadow-xl flex flex-col"
            >
              <div className="h-8 bg-[#161e38] flex items-center justify-between px-6 text-white/40 text-[10px] font-bold">
                <span>9:41</span>
                <div className="flex gap-1">
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              <div className="custom-scrollbar flex-1 overflow-y-auto p-5 bg-white">
                <RuntimeProvider fields={state.fields} steps={state.steps} logicRules={state.logicRules}>
                  <div className="flex flex-col gap-3">
                    <ActiveRuleIndicator />
                    <RuntimeRenderer progressBarType={state.progressBarType} />
                  </div>
                </RuntimeProvider>
              </div>
            </div>
          ) : (
            <div className="custom-scrollbar w-full max-w-[680px] max-h-[90%] overflow-y-auto">
              <RuntimeProvider fields={state.fields} steps={state.steps} logicRules={state.logicRules}>
                <div className="flex flex-col gap-3">
                  <ActiveRuleIndicator />
                  <RuntimeRenderer progressBarType={state.progressBarType} />
                </div>
              </RuntimeProvider>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      <BuilderTopbar />

      {state.formId && (
        <div className="flex justify-between items-center gap-4 z-40 bg-dash-surface px-6 py-2.5 border-b border-dash-border">
          <ConflictWarnings
            formId={state.formId}
            localLastSaved={state.lastSaved}
            currentUserEmail="admin@leadsmind.com"
            onRefreshTriggered={() => window.location.reload()}
          />
          <CollabPresenceList
            formId={state.formId}
            currentUserEmail="admin@leadsmind.com"
            currentClientId="client-editor-1"
            isEditor={true}
            editingSection={state.selectedFieldId}
          />
          <RealtimeNotificationHandler
            formId={state.formId}
            currentUserEmail="admin@leadsmind.com"
          />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <BuilderSidebar />
        <BuilderCanvas />
        <BuilderSettings />
      </div>
    </div>
  );
}
