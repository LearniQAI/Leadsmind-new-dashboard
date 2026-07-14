'use client';

import React from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { Plus, Trash2, Cpu } from 'lucide-react';

export function IntelligenceBuilder() {
  const { state, dispatch } = useFormBuilder();

  const hiddenFields = state.config.hiddenFields || [];

  const addHiddenField = () => {
    const newField = {
      id: `hidden_${Math.random().toString(36).substring(2, 9)}`,
      name: 'utm_source',
      type: 'utm', // 'static', 'url_param', 'utm'
      value: ''
    };
    dispatch({ type: 'UPDATE_CONFIG', config: { hiddenFields: [...hiddenFields, newField] } });
  };

  const updateHiddenField = (index: number, updates: any) => {
    const newFields = [...hiddenFields];
    newFields[index] = { ...newFields[index], ...updates };
    dispatch({ type: 'UPDATE_CONFIG', config: { hiddenFields: newFields } });
  };

  const removeHiddenField = (index: number) => {
    const newFields = hiddenFields.filter((_, i) => i !== index);
    dispatch({ type: 'UPDATE_CONFIG', config: { hiddenFields: newFields } });
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="builder-section-label m-0 flex items-center gap-1.5">
            <Cpu size={12} className="text-dash-accent" />
            Hidden fields &amp; tracking
          </p>
          <button
            onClick={addHiddenField}
            className="text-[10px] font-bold text-dash-accent hover:text-dash-accent/80 flex items-center gap-1"
          >
            <Plus size={10} /> Add
          </button>
        </div>

        <p className="text-[11px] !text-dash-textMuted mb-4 leading-relaxed">
          Hidden fields are automatically injected into submissions. Use them for UTM tracking or capturing URL parameters.
        </p>

        <div className="flex flex-col gap-3">
          {hiddenFields.length === 0 && (
            <div className="text-center py-6 border border-dash-border border-dashed rounded-xl bg-dash-surface">
              <p className="text-xs !text-dash-textMuted">No hidden fields configured.</p>
            </div>
          )}

          {hiddenFields.map((field: any, i: number) => (
            <div key={field.id} className="p-3 bg-white border border-dash-border rounded-xl flex flex-col gap-3 relative group">
              <button
                onClick={() => removeHiddenField(i)}
                className="absolute top-2 right-2 text-red/50 hover:text-red opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none"
              >
                <Trash2 size={12} />
              </button>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] font-bold !text-dash-textMuted mb-1.5 block">Source type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateHiddenField(i, { type: e.target.value })}
                    className="w-full h-8 px-2 bg-dash-surface border border-dash-border rounded-lg !text-dash-text text-[11px] outline-none focus:border-dash-accent"
                  >
                    <option value="utm">UTM Parameter</option>
                    <option value="url_param">URL Parameter</option>
                    <option value="static">Static Value</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold !text-dash-textMuted mb-1.5 block">Field name</label>
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateHiddenField(i, { name: e.target.value })}
                  placeholder="e.g. utm_campaign"
                  className="w-full h-8 px-2 bg-dash-surface border border-dash-border rounded-lg !text-dash-text text-[11px] outline-none focus:border-dash-accent"
                />
              </div>

              {field.type !== 'utm' && (
                <div>
                  <label className="text-[10px] font-bold !text-dash-textMuted mb-1.5 block">
                    {field.type === 'static' ? 'Value' : 'Fallback value'}
                  </label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateHiddenField(i, { value: e.target.value })}
                    placeholder={field.type === 'static' ? "Static value" : "Optional fallback"}
                    className="w-full h-8 px-2 bg-dash-surface border border-dash-border rounded-lg !text-dash-text text-[11px] outline-none focus:border-dash-accent"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
