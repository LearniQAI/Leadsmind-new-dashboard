'use client';

import React, { useState } from 'react';
import { useFormBuilder, FormStep } from './FormBuilderContext';
import { Plus, Trash2, ArrowUp, ArrowDown, Settings2 } from 'lucide-react';

export function StepManager() {
  const { state, dispatch } = useFormBuilder();
  const { steps, fields, progressBarType } = state;
  const [newTitle, setNewTitle] = useState('');

  const handleAddStep = () => {
    const title = newTitle.trim() || `Step ${steps.length + 1}`;
    const step: FormStep = {
      id: `step_${Date.now()}`,
      title,
      type: 'standard',
    };
    dispatch({ type: 'ADD_STEP', step });
    setNewTitle('');
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === steps.length - 1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    dispatch({ type: 'REORDER_STEPS', startIndex: index, endIndex: nextIndex });
  };

  return (
    <div className="flex flex-col gap-6" style={{ padding: '8px 0 20px' }}>
      
      {/* Configure Progress Bar Type */}
      <div className="p-4 bg-white/2 border border-white/5 rounded-2xl">
        <label className="text-[10px] font-black uppercase tracking-widest text-[#94a3c8] mb-3 block">
          Progress Bar Indicator
        </label>
        <div className="flex flex-col gap-2">
          {(['percentage', 'numbered', 'minimal'] as const).map((type) => (
            <button
              key={type}
              onClick={() => dispatch({ type: 'SET_PROGRESS_BAR_TYPE', barType: type })}
              className={`px-4 py-2 text-left rounded-xl text-xs font-bold font-dm-sans transition-all border ${
                progressBarType === type
                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/10'
                  : 'bg-white/5 border-white/5 text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              {type === 'percentage' && 'Percentage Counter'}
              {type === 'numbered' && 'Numbered Progress Dots'}
              {type === 'minimal' && 'Minimal Progress Line'}
            </button>
          ))}
        </div>
      </div>

      {/* Steps List */}
      <div>
        <p className="builder-section-label" style={{ marginBottom: 12 }}>Form Pages / Steps</p>
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => {
            const stepFieldsCount = fields.filter(f => f.stepId === step.id).length;

            return (
              <div
                key={step.id}
                className="p-4 bg-[#0c1535]/80 border border-white/5 rounded-2xl flex flex-col gap-3 group hover:border-[#2563eb]/20 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => dispatch({ type: 'UPDATE_STEP', id: step.id, updates: { title: e.target.value } })}
                    className="bg-transparent border-none text-xs font-black uppercase tracking-wide text-white focus:outline-none focus:ring-0 p-0 flex-1"
                    placeholder="Step Title"
                  />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMoveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveStep(index, 'down')}
                      disabled={index === steps.length - 1}
                      className="p-1 hover:bg-white/5 rounded text-white/40 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown size={12} />
                    </button>
                    {steps.length > 1 && (
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_STEP', id: step.id })}
                        className="p-1 hover:bg-rose-500/10 rounded text-rose-400 hover:text-rose-500"
                        title="Delete Step"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-bold text-white/30 uppercase tracking-widest pt-2 border-t border-white/2">
                  <span>{stepFieldsCount} Fields Assigned</span>
                  
                  {/* Step Type Dropdown */}
                  <select
                    value={step.type}
                    onChange={(e) => dispatch({ type: 'UPDATE_STEP', id: step.id, updates: { type: e.target.value as any } })}
                    className="bg-transparent border-none text-[9px] font-black uppercase text-white/40 hover:text-white focus:outline-none cursor-pointer p-0"
                  >
                    <option value="standard" className="bg-[#0b132c]">Standard</option>
                    <option value="completion" className="bg-[#0b132c]">Completion</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Step Controller */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New Step Name..."
          className="settings-input flex-1 h-10 px-3 bg-white/5 border-white/10 rounded-xl text-xs text-white"
          onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
        />
        <button
          onClick={handleAddStep}
          className="px-4 bg-primary hover:bg-primary/95 text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-primary/15"
          title="Add Step"
        >
          <Plus size={16} />
        </button>
      </div>

    </div>
  );
}
