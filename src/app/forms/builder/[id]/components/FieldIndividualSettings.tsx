'use client';

import React from 'react';
import { Trash2, Plus } from 'lucide-react';

interface FieldIndividualSettingsProps {
  selectedField: any;
  steps: { id: string; title: string }[];
  dispatch: (action: any) => void;
}

export function FieldIndividualSettings({ selectedField, steps, dispatch }: FieldIndividualSettingsProps) {
  const handleUpdate = (updates: any) => {
    dispatch({ type: 'UPDATE_FIELD', id: selectedField.id, updates });
  };

  const handleOptionChange = (index: number, val: string) => {
    const currentOptions = [...(selectedField.options || [])];
    currentOptions[index] = val;
    handleUpdate({ options: currentOptions });
  };

  const handleAddOption = () => {
    const currentOptions = [...(selectedField.options || [])];
    currentOptions.push(`Option ${currentOptions.length + 1}`);
    handleUpdate({ options: currentOptions });
  };

  const handleRemoveOption = (index: number) => {
    const currentOptions = (selectedField.options || []).filter((_, i) => i !== index);
    handleUpdate({ options: currentOptions });
  };

  return (
    <div className="builder-panel__body custom-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, padding: '0 20px 20px' }}>
      
      {/* Label */}
      <div>
        <label className="settings-label" htmlFor="field-label-input">Label Text</label>
        <input
          id="field-label-input"
          type="text"
          value={selectedField.label}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          className="settings-input w-full h-10 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs"
          placeholder="Label text..."
        />
      </div>

      {/* Assign to Step */}
      <div>
        <label className="settings-label" htmlFor="field-step-assign">Assign to Step</label>
        <select
          id="field-step-assign"
          value={selectedField.stepId}
          onChange={(e) => handleUpdate({ stepId: e.target.value })}
          className="settings-input w-full h-10 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs focus:outline-none cursor-pointer"
        >
          {steps.map(s => (
            <option key={s.id} value={s.id} className="bg-[#0b132c] text-white">
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Placeholder - Hide for Checkbox */}
      {selectedField.type !== 'checkbox' && (
        <div>
          <label className="settings-label" htmlFor="field-placeholder-input">Placeholder Text</label>
          <input
            id="field-placeholder-input"
            type="text"
            value={selectedField.placeholder || ''}
            onChange={(e) => handleUpdate({ placeholder: e.target.value })}
            className="settings-input w-full h-10 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs"
            placeholder="Placeholder guidance..."
          />
        </div>
      )}

      {/* Help Text */}
      <div>
        <label className="settings-label" htmlFor="field-help-input">Help / Context Description</label>
        <input
          id="field-help-input"
          type="text"
          value={selectedField.helpText || ''}
          onChange={(e) => handleUpdate({ helpText: e.target.value })}
          className="settings-input w-full h-10 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs"
          placeholder="Help text helper..."
        />
      </div>

      {/* Dropdown Options Manager */}
      {selectedField.type === 'dropdown' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label className="settings-label">Dropdown Menu Options</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(selectedField.options || []).map((opt: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  className="settings-input flex-1 h-9 px-3 bg-white/5 border-white/10 rounded-xl text-white text-xs"
                />
                <button
                  onClick={() => handleRemoveOption(i)}
                  className="p-2 hover:bg-rose-500/10 text-rose-400 rounded-lg hover:text-rose-500 transition-colors"
                  title="Remove Option"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddOption}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-white/10 hover:border-white/20 bg-transparent text-white/60 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors mt-2"
            >
              <Plus size={12} /> Add Select Option
            </button>
          </div>
        </div>
      )}

      {/* Required Switch */}
      <div className="flex items-center justify-between p-3 bg-white/2 border border-white/5 rounded-xl">
        <label htmlFor="field-required-toggle" className="text-xs font-bold text-white/80 font-dm-sans cursor-pointer select-none">
          Required Input
        </label>
        <div className="relative flex items-center">
          <input
            id="field-required-toggle"
            type="checkbox"
            checked={selectedField.required}
            onChange={(e) => handleUpdate({ required: e.target.checked })}
            className="w-9 h-5 rounded-full border border-white/10 bg-white/5 checked:bg-[#2563eb] checked:border-transparent focus:outline-none transition-all appearance-none cursor-pointer relative before:content-[''] before:absolute before:w-3.5 before:h-3.5 before:rounded-full before:bg-white/40 before:top-0.5 before:left-0.5 checked:before:left-4.5 checked:before:bg-white before:transition-all"
          />
        </div>
      </div>

      {/* Field Width */}
      <div>
        <label className="settings-label">Layout Column Width</label>
        <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl">
          <button
            onClick={() => handleUpdate({ width: 'full' })}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              selectedField.width === 'full'
                ? 'bg-primary text-white shadow-md shadow-primary/15'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Full Width
          </button>
          <button
            onClick={() => handleUpdate({ width: 'half' })}
            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
              selectedField.width === 'half'
                ? 'bg-primary text-white shadow-md shadow-primary/15'
                : 'text-white/40 hover:text-white'
            }`}
          >
            Half Width
          </button>
        </div>
      </div>

    </div>
  );
}
