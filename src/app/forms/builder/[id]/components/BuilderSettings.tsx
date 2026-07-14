'use client';

import React, { useState } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { LogicBuilder } from './LogicBuilder';
import { FormGlobalSettings } from './FormGlobalSettings';
import { FieldIndividualSettings } from './FieldIndividualSettings';
import { Sliders, Settings2 } from 'lucide-react';

export function BuilderSettings() {
  const { state, dispatch } = useFormBuilder();
  const [activeTab, setActiveTab] = useState<'settings' | 'logic'>('settings');
  const selectedField = state.fields.find(f => f.id === state.selectedFieldId);

  return (
    <div className="builder-panel builder-panel--right w-[300px] flex flex-col">

      {/* Right Sidebar Tabs */}
      <div className="flex border-b border-dash-border bg-white p-1 m-2.5 rounded-xl">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none ${
            activeTab === 'settings'
              ? 'bg-dash-accent text-white shadow-md'
              : '!text-dash-textMuted hover:!text-dash-text'
          }`}
        >
          <Settings2 size={11} /> Settings
        </button>
        <button
          onClick={() => setActiveTab('logic')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none ${
            activeTab === 'logic'
              ? 'bg-dash-accent text-white shadow-md'
              : '!text-dash-textMuted hover:!text-dash-text'
          }`}
        >
          <Sliders size={11} /> Logic
        </button>
      </div>

      {activeTab === 'settings' ? (
        !selectedField ? (
          <>
            <div className="builder-panel__header">
              <h2 className="builder-panel__title">Form settings</h2>
              <p className="builder-panel__sub">
                Global configuration controls
              </p>
            </div>
            <FormGlobalSettings config={state.config} dispatch={dispatch} />
          </>
        ) : (
          <>
            <div className="builder-panel__header">
              <h2 className="builder-panel__title">Field settings</h2>
              <p className="builder-panel__sub capitalize">
                {selectedField.type} input settings
              </p>
            </div>
            <FieldIndividualSettings
              selectedField={selectedField}
              steps={state.steps}
              dispatch={dispatch}
            />
          </>
        )
      ) : (
        <div className="builder-panel__body custom-scrollbar flex-1 overflow-y-auto px-5 pb-5">
          <LogicBuilder />
        </div>
      )}
    </div>
  );
}
