'use client';

import React from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { Settings2, Plus, Trash2, Cpu } from 'lucide-react';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <p className="builder-section-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Cpu size={12} className="text-[#2563eb]" />
            Hidden Fields &amp; Tracking
          </p>
          <button
            onClick={addHiddenField}
            className="text-[9px] font-black uppercase tracking-wider text-primary hover:text-blue-400 flex items-center gap-1"
          >
            <Plus size={10} /> Add
          </button>
        </div>
        
        <p className="text-[11px] text-[#4a5a82] font-dm-sans mb-4 leading-relaxed">
          Hidden fields are automatically injected into submissions. Use them for UTM tracking or capturing URL parameters.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {hiddenFields.length === 0 && (
            <div className="text-center py-6 border border-white/5 border-dashed rounded-xl bg-white/2">
              <p className="text-xs text-white/30 font-dm-sans">No hidden fields configured.</p>
            </div>
          )}

          {hiddenFields.map((field: any, i: number) => (
            <div key={field.id} className="p-3 bg-white/5 border border-white/10 rounded-xl flex flex-col gap-3 relative group">
              <button
                onClick={() => removeHiddenField(i)}
                className="absolute top-2 right-2 text-rose-500/50 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={12} />
              </button>

              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8] mb-1.5 block">Source Type</label>
                  <select
                    value={field.type}
                    onChange={(e) => updateHiddenField(i, { type: e.target.value })}
                    className="w-full h-8 px-2 bg-[#0b132c] border border-white/10 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
                  >
                    <option value="utm">UTM Parameter</option>
                    <option value="url_param">URL Parameter</option>
                    <option value="static">Static Value</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8] mb-1.5 block">Field Name</label>
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => updateHiddenField(i, { name: e.target.value })}
                  placeholder="e.g. utm_campaign"
                  className="w-full h-8 px-2 bg-[#0b132c] border border-white/10 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
                />
              </div>

              {field.type !== 'utm' && (
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8] mb-1.5 block">
                    {field.type === 'static' ? 'Value' : 'Fallback Value'}
                  </label>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateHiddenField(i, { value: e.target.value })}
                    placeholder={field.type === 'static' ? "Static value" : "Optional fallback"}
                    className="w-full h-8 px-2 bg-[#0b132c] border border-white/10 rounded-lg text-white text-[11px] font-dm-sans outline-none focus:border-primary"
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
