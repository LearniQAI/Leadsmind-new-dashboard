'use client';

import React from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { LogicRule } from './LogicEngine';
import { Plus, Trash2 } from 'lucide-react';

export function LogicBuilder() {
  const { state, dispatch } = useFormBuilder();
  const { fields, steps, logicRules } = state;

  const handleAddRule = () => {
    if (fields.length === 0) return;
    const defaultTrigger = fields[0].id;
    const defaultTarget = fields[1]?.id || fields[0].id;

    const newRule: LogicRule = {
      id: `rule_${Date.now()}`,
      triggerFieldId: defaultTrigger,
      operator: 'equals',
      value: '',
      action: 'hide_field',
      targetId: defaultTarget,
    };
    dispatch({ type: 'ADD_LOGIC_RULE', rule: newRule });
  };

  const handleUpdateRule = (id: string, updates: Partial<LogicRule>) => {
    dispatch({ type: 'UPDATE_LOGIC_RULE', id, updates });
  };

  const handleRemoveRule = (id: string) => {
    dispatch({ type: 'REMOVE_LOGIC_RULE', id });
  };

  return (
    <div className="flex flex-col gap-6" style={{ padding: '8px 0 20px' }}>
      <div className="flex items-center justify-between">
        <p className="builder-section-label" style={{ margin: 0 }}>Conditional Rules</p>
        <button
          onClick={handleAddRule}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-[#2563eb] hover:border-transparent text-[#60a5fa] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all"
        >
          <Plus size={10} /> Add Rule
        </button>
      </div>

      {logicRules.length === 0 ? (
        <div className="text-center py-10 bg-white/2 border border-dashed border-white/5 rounded-2xl p-4">
          <p className="text-xs text-white/30 font-dm-sans leading-relaxed">
            No conditional logic rules configured yet. Rules let you show/hide inputs or skip pages dynamically.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {logicRules.map((rule) => {
            // Find fields/steps to populate target dropdown
            const isJumpAction = rule.action === 'jump_to_step';

            return (
              <div
                key={rule.id}
                className="p-4 bg-[#0c1535]/80 border border-white/5 rounded-2xl flex flex-col gap-3 relative group hover:border-[#2563eb]/20 transition-all"
              >
                {/* Delete rule button */}
                <button
                  onClick={() => handleRemoveRule(rule.id)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-rose-500/10 rounded text-rose-400 hover:text-rose-500"
                  title="Remove Rule"
                >
                  <Trash2 size={12} />
                </button>

                {/* IF Section */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8]">IF Field</span>
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

                {/* Condition & Value */}
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
                      <option value="checked" className="bg-[#0b132c]">Is Checked</option>
                      <option value="unchecked" className="bg-[#0b132c]">Is Unchecked</option>
                      <option value="greater_than" className="bg-[#0b132c]">&gt; Greater Than</option>
                      <option value="less_than" className="bg-[#0b132c]">&lt; Less Than</option>
                    </select>
                  </div>

                  {rule.operator !== 'checked' && rule.operator !== 'unchecked' && (
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
                  )}
                </div>

                {/* THEN Action */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-[#94a3c8]">THEN Action</span>
                  <select
                    value={rule.action}
                    onChange={(e) => {
                      const nextAction = e.target.value as any;
                      const nextTargetId = nextAction === 'jump_to_step' ? (steps[0]?.id || '') : (fields[0]?.id || '');
                      handleUpdateRule(rule.id, { action: nextAction, targetId: nextTargetId });
                    }}
                    className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                  >
                    <option value="hide_field" className="bg-[#0b132c]">Hide Field</option>
                    <option value="show_field" className="bg-[#0b132c]">Show Field</option>
                    <option value="jump_to_step" className="bg-[#0b132c]">Jump to Step</option>
                    <option value="set_value" className="bg-[#0b132c]">Set Field Value</option>
                  </select>
                </div>

                {/* TARGET Selection */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                    {isJumpAction ? 'Target Step' : 'Target Field'}
                  </span>
                  
                  {isJumpAction ? (
                    <select
                      value={rule.targetId}
                      onChange={(e) => handleUpdateRule(rule.id, { targetId: e.target.value })}
                      className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                    >
                      {steps.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0b132c]">
                          {s.title}
                        </option>
                      ))}
                    </select>
                  ) : (
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
                  )}
                </div>

                {/* Overridden Value (for set_value action) */}
                {rule.action === 'set_value' && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Value to Set</span>
                    <input
                      type="text"
                      value={rule.targetValue || ''}
                      onChange={(e) => handleUpdateRule(rule.id, { targetValue: e.target.value })}
                      className="w-full h-8 px-2 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none"
                      placeholder="Replacement text..."
                    />
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
