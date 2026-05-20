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
    <div className="builder-panel builder-panel--right" style={{ width: 300, display: 'flex', flexDirection: 'column' }}>
      
      {/* Right Sidebar Tabs */}
      <div className="flex border-b border-white/5 bg-white/1 p-1 m-2.5 rounded-xl">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'settings'
              ? 'bg-primary text-white shadow-md'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <Settings2 size={11} /> Settings
        </button>
        <button
          onClick={() => setActiveTab('logic')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${
            activeTab === 'logic'
              ? 'bg-primary text-white shadow-md'
              : 'text-white/40 hover:text-white'
          }`}
        >
          <Sliders size={11} /> Logic
        </button>
      </div>

      {activeTab === 'settings' ? (
        !selectedField ? (
          <>
            <div className="builder-panel__header">
              <h2 className="builder-panel__title">Form Settings</h2>
              <p className="builder-panel__sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Global configuration controls
              </p>
            </div>
            <FormGlobalSettings config={state.config} dispatch={dispatch} />
          </>
        ) : (
          <>
            <div className="builder-panel__header">
              <h2 className="builder-panel__title">Field Settings</h2>
              <p className="builder-panel__sub" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
        <div className="builder-panel__body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          <LogicBuilder />
        </div>
      )}
    </div>
  );
}
