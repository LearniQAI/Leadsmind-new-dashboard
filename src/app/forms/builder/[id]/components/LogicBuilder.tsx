'use client';

import React from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { LogicRule } from './LogicEngine';
import { Plus, Trash2, Sparkles } from 'lucide-react';

const STARTER_EXAMPLES: { label: string; rule: Omit<LogicRule, 'id'> }[] = [
  {
    label: 'Show follow-up question when "Yes" is selected',
    rule: { triggerFieldId: '', operator: 'equals', value: 'Yes', action: 'show_field', targetId: '' },
  },
  {
    label: 'Hide optional field when "No" is selected',
    rule: { triggerFieldId: '', operator: 'equals', value: 'No', action: 'hide_field', targetId: '' },
  },
  {
    label: 'Show discount field when value > 100',
    rule: { triggerFieldId: '', operator: 'greater_than', value: '100', action: 'show_field', targetId: '' },
  },
];

export function LogicBuilder() {
  const { state, dispatch } = useFormBuilder();
  const { fields, logicRules } = state;

  const handleAddRule = (defaults?: Partial<LogicRule>) => {
    if (fields.length === 0) return;
    const defaultTrigger = fields[0].id;
    const defaultTarget = fields[1]?.id || fields[0].id;

    const newRule: LogicRule = {
      id: `rule_${Date.now()}`,
      triggerFieldId: defaultTrigger,
      operator: 'equals',
      value: '',
      action: 'show_field',
      targetId: defaultTarget,
      ...defaults,
    };

    // Fill in blanks for starter examples
    if (!newRule.triggerFieldId) newRule.triggerFieldId = defaultTrigger;
    if (!newRule.targetId) newRule.targetId = defaultTarget;

    dispatch({ type: 'ADD_LOGIC_RULE', rule: newRule });
  };

  const handleUpdateRule = (id: string, updates: Partial<LogicRule>) => {
    dispatch({ type: 'UPDATE_LOGIC_RULE', id, updates });
  };

  const handleRemoveRule = (id: string) => {
    dispatch({ type: 'REMOVE_LOGIC_RULE', id });
  };

  const handleUseStarter = (example: typeof STARTER_EXAMPLES[number]) => {
    handleAddRule({ ...example.rule });
  };

  return (
    <div className="flex flex-col gap-6" style={{ padding: '8px 0 20px' }}>
      <div className="flex items-center justify-between">
        <p className="builder-section-label" style={{ margin: 0 }}>Conditional Rules</p>
        <button
          onClick={() => handleAddRule()}
          disabled={fields.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-[#2563eb] hover:border-transparent text-[#60a5fa] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus size={10} /> Add Rule
        </button>
      </div>

      {logicRules.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="text-center py-10 bg-white/2 border border-dashed border-white/5 rounded-2xl p-4">
            <p className="text-xs text-white/30 font-dm-sans leading-relaxed">
              No conditional logic rules yet. Rules let you show or hide fields based on user responses.
            </p>
          </div>

          {/* Starter examples */}
          {fields.length >= 2 && (
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                <Sparkles size={10} /> Quick Start Examples
              </p>
              {STARTER_EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => handleUseStarter(ex)}
                  className="text-left p-3 bg-white/3 border border-white/5 hover:border-[#2563eb]/20 rounded-xl transition-all text-[10px] text-white/50 hover:text-white font-dm-sans leading-relaxed"
                >
                  {ex.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {logicRules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 bg-[#0c1535]/80 border border-white/5 rounded-2xl flex flex-col gap-3 relative group hover:border-[#2563eb]/20 transition-all"
            >
              <button
                onClick={() => handleRemoveRule(rule.id)}
                className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-500/10 rounded text-rose-400 hover:text-rose-500"
                title="Remove Rule"
              >
                <Trash2 size={12} />
              </button>

              {/* IF Field */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8]">IF</span>
                <select
                  value={rule.triggerFieldId}
                  onChange={(e) => handleUpdateRule(rule.id, { triggerFieldId: e.target.value })}
                  className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                >
                  {fields.map(f => (
                    <option key={f.id} value={f.id} className="bg-[#0b132c] text-white">
                      {f.label} ({f.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Operator & Value */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Condition</span>
                  <select
                    value={rule.operator}
                    onChange={(e) => handleUpdateRule(rule.id, { operator: e.target.value as any })}
                    className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="equals" className="bg-[#0b132c]">Equals</option>
                    <option value="not_equals" className="bg-[#0b132c]">Not Equals</option>
                    <option value="contains" className="bg-[#0b132c]">Contains</option>
                    <option value="greater_than" className="bg-[#0b132c]">&gt; Greater Than</option>
                    <option value="less_than" className="bg-[#0b132c]">&lt; Less Than</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Value</span>
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => handleUpdateRule(rule.id, { value: e.target.value })}
                    className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                    placeholder="Value..."
                  />
                </div>
              </div>

              {/* THEN Action */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8]">THEN</span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Action</span>
                    <select
                      value={rule.action}
                      onChange={(e) => handleUpdateRule(rule.id, { action: e.target.value as any })}
                      className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                    >
                      <option value="show_field" className="bg-[#0b132c]">Show Field</option>
                      <option value="hide_field" className="bg-[#0b132c]">Hide Field</option>
                    </select>
                  </div>

                  {/* Target Field */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Field</span>
                    <select
                      value={rule.targetId}
                      onChange={(e) => handleUpdateRule(rule.id, { targetId: e.target.value })}
                      className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                    >
                      {fields.filter(f => f.id !== rule.triggerFieldId).map(f => (
                        <option key={f.id} value={f.id} className="bg-[#0b132c]">
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
