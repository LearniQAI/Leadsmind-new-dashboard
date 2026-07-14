'use client';

import React, { useState } from 'react';
import { useFormBuilder, FormStep } from './FormBuilderContext';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex flex-col gap-6 py-2 pb-5">

      {/* Configure Progress Bar Type */}
      <div className="p-4 bg-white border border-dash-border rounded-2xl">
        <label className="text-[11px] font-bold !text-dash-textMuted mb-3 block">
          Progress bar indicator
        </label>
        <div className="flex flex-col gap-2">
          {(['percentage', 'numbered', 'minimal'] as const).map((type) => (
            <button
              key={type}
              onClick={() => dispatch({ type: 'SET_PROGRESS_BAR_TYPE', barType: type })}
              className={cn(
                "px-4 py-2 text-left rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none border",
                progressBarType === type
                  ? 'bg-dash-accent border-dash-accent text-white shadow-sm'
                  : 'bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text'
              )}
            >
              {type === 'percentage' && 'Percentage counter'}
              {type === 'numbered' && 'Numbered progress dots'}
              {type === 'minimal' && 'Minimal progress line'}
            </button>
          ))}
        </div>
      </div>

      {/* Steps List */}
      <div>
        <p className="builder-section-label">Form pages / steps</p>
        <div className="flex flex-col gap-3">
          {steps.map((step, index) => {
            const stepFieldsCount = fields.filter(f => f.stepId === step.id).length;

            return (
              <div
                key={step.id}
                className="p-4 bg-white border border-dash-border rounded-2xl flex flex-col gap-3 group hover:border-dash-accent/30 transition-colors motion-reduce:transition-none"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => dispatch({ type: 'UPDATE_STEP', id: step.id, updates: { title: e.target.value } })}
                    className="bg-transparent border-none text-xs font-bold !text-dash-text focus:outline-none focus:ring-0 p-0 flex-1"
                    placeholder="Step Title"
                  />
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none">
                    <button
                      onClick={() => handleMoveStep(index, 'up')}
                      disabled={index === 0}
                      className="p-1 hover:bg-dash-surface rounded !text-dash-textMuted hover:!text-dash-text disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      onClick={() => handleMoveStep(index, 'down')}
                      disabled={index === steps.length - 1}
                      className="p-1 hover:bg-dash-surface rounded !text-dash-textMuted hover:!text-dash-text disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ArrowDown size={12} />
                    </button>
                    {steps.length > 1 && (
                      <button
                        onClick={() => dispatch({ type: 'REMOVE_STEP', id: step.id })}
                        className="p-1 hover:bg-red/10 rounded text-red hover:text-red"
                        title="Delete Step"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] font-bold !text-dash-textMuted pt-2 border-t border-dash-border">
                  <span>{stepFieldsCount} fields assigned</span>

                  {/* Step Type Dropdown */}
                  <select
                    value={step.type}
                    onChange={(e) => dispatch({ type: 'UPDATE_STEP', id: step.id, updates: { type: e.target.value as any } })}
                    className="bg-transparent border-none text-[10px] font-bold !text-dash-textMuted hover:!text-dash-text focus:outline-none cursor-pointer p-0"
                  >
                    <option value="standard">Standard</option>
                    <option value="completion">Completion</option>
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
          className="settings-input flex-1 h-10 px-3 text-xs"
          onKeyDown={(e) => e.key === 'Enter' && handleAddStep()}
        />
        <button
          onClick={handleAddStep}
          className="px-4 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl flex items-center justify-center transition-colors motion-reduce:transition-none"
          title="Add Step"
        >
          <Plus size={16} />
        </button>
      </div>

    </div>
  );
}
