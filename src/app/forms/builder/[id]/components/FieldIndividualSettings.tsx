'use client';

import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="builder-panel__body custom-scrollbar flex-1 overflow-y-auto flex flex-col gap-5 px-5 pb-5">

      {/* Label */}
      <div>
        <label className="settings-label" htmlFor="field-label-input">Label text</label>
        <input
          id="field-label-input"
          type="text"
          value={selectedField.label}
          onChange={(e) => handleUpdate({ label: e.target.value })}
          className="settings-input h-10 px-3 text-xs"
          placeholder="Label text..."
        />
      </div>

      {/* Assign to Step */}
      <div>
        <label className="settings-label" htmlFor="field-step-assign">Assign to step</label>
        <select
          id="field-step-assign"
          value={selectedField.stepId}
          onChange={(e) => handleUpdate({ stepId: e.target.value })}
          className="settings-input h-10 px-3 text-xs cursor-pointer"
        >
          {steps.map(s => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </div>

      {/* Placeholder - Hide for Checkbox */}
      {selectedField.type !== 'checkbox' && (
        <div>
          <label className="settings-label" htmlFor="field-placeholder-input">Placeholder text</label>
          <input
            id="field-placeholder-input"
            type="text"
            value={selectedField.placeholder || ''}
            onChange={(e) => handleUpdate({ placeholder: e.target.value })}
            className="settings-input h-10 px-3 text-xs"
            placeholder="Placeholder guidance..."
          />
        </div>
      )}

      {/* Help Text */}
      <div>
        <label className="settings-label" htmlFor="field-help-input">Help / context description</label>
        <input
          id="field-help-input"
          type="text"
          value={selectedField.helpText || ''}
          onChange={(e) => handleUpdate({ helpText: e.target.value })}
          className="settings-input h-10 px-3 text-xs"
          placeholder="Help text helper..."
        />
      </div>

      {/* Dropdown Options Manager */}
      {selectedField.type === 'dropdown' && (
        <div className="flex flex-col gap-2">
          <label className="settings-label">Dropdown menu options</label>
          <div className="flex flex-col gap-2">
            {(selectedField.options || []).map((opt: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => handleOptionChange(i, e.target.value)}
                  className="settings-input flex-1 h-9 px-3 text-xs"
                />
                <button
                  onClick={() => handleRemoveOption(i)}
                  className="p-2 hover:bg-red/10 text-red rounded-lg hover:text-red transition-colors motion-reduce:transition-none"
                  title="Remove Option"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            <button
              onClick={handleAddOption}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-dash-border hover:border-dash-text/20 bg-transparent !text-dash-textMuted hover:!text-dash-text rounded-xl text-[10px] font-bold transition-colors motion-reduce:transition-none mt-2"
            >
              <Plus size={12} /> Add select option
            </button>
          </div>
        </div>
      )}

      <div
        className="flex items-center justify-between p-3 bg-white border border-dash-border rounded-xl cursor-pointer hover:bg-dash-surface transition-colors motion-reduce:transition-none"
        onClick={() => handleUpdate({ required: !selectedField.required })}
      >
        <span className="text-xs font-bold !text-dash-text select-none">
          Required input
        </span>
        <div className="relative flex items-center">
          <button
            type="button"
            role="switch"
            aria-checked={selectedField.required}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out motion-reduce:transition-none focus:outline-none",
              selectedField.required ? 'bg-dash-accent' : 'bg-dash-border'
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out motion-reduce:transition-none",
                selectedField.required ? 'translate-x-4' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Field Width */}
      <div>
        <label className="settings-label">Layout column width</label>
        <div className="flex gap-2 p-1 bg-dash-surface border border-dash-border rounded-xl">
          <button
            onClick={() => handleUpdate({ width: 'full' })}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
              selectedField.width === 'full' ? 'bg-dash-accent text-white shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
            )}
          >
            Full width
          </button>
          <button
            onClick={() => handleUpdate({ width: 'half' })}
            className={cn(
              "flex-1 py-2 text-[10px] font-bold rounded-lg transition-colors motion-reduce:transition-none",
              selectedField.width === 'half' ? 'bg-dash-accent text-white shadow-sm' : '!text-dash-textMuted hover:!text-dash-text'
            )}
          >
            Half width
          </button>
        </div>
      </div>

    </div>
  );
}
