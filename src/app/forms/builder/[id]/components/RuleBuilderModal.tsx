'use client';

import React, { useState, useEffect } from 'react';
import { LogicRule } from './LogicEngine';
import { FormField, FormStep } from './FormBuilderContext';
import { X, Plus, Save } from 'lucide-react';
import { validateRule } from './RulePersistenceService';

interface RuleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: LogicRule) => void;
  fields: FormField[];
  steps: FormStep[];
  editingRule?: LogicRule | null;
}

export function RuleBuilderModal({
  isOpen,
  onClose,
  onSave,
  fields,
  steps,
  editingRule,
}: RuleBuilderModalProps) {
  const [triggerFieldId, setTriggerFieldId] = useState('');
  const [operator, setOperator] = useState<LogicRule['operator']>('equals');
  const [value, setValue] = useState('');
  const [action, setAction] = useState<LogicRule['action']>('show_field');
  const [targetId, setTargetId] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRule) {
      setTriggerFieldId(editingRule.triggerFieldId);
      setOperator(editingRule.operator);
      setValue(editingRule.value);
      setAction(editingRule.action);
      setTargetId(editingRule.targetId);
      setTargetValue(editingRule.targetValue || '');
    } else if (fields.length > 0) {
      setTriggerFieldId(fields[0].id);
      setTargetId(fields[1]?.id || fields[0].id);
      setAction('show_field');
      setOperator('equals');
      setValue('');
      setTargetValue('');
    }
    setError(null);
  }, [editingRule, fields, isOpen]);

  const needsValue = operator !== 'checked' && operator !== 'unchecked';
  const isStepAction = action === 'skip_step';
  const showTargetValue = false;

  const filteredTargets = isStepAction
    ? steps.map(s => ({ id: s.id, label: s.title || 'Untitled Step', type: 'step' as const }))
    : fields.filter(f => f.id !== triggerFieldId).map(f => ({ id: f.id, label: f.label, type: 'field' as const }));

  const handleSave = () => {
    const partial: Partial<LogicRule> = {
      triggerFieldId,
      operator,
      value,
      action,
      targetId,
      targetValue: showTargetValue ? targetValue : undefined,
    };

    const err = validateRule(partial);
    if (err) {
      setError(err);
      return;
    }

    const rule: LogicRule = {
      id: editingRule?.id || `rule_${Date.now()}`,
      triggerFieldId,
      operator,
      value: needsValue ? value : '',
      action,
      targetId,
      targetValue: showTargetValue ? targetValue : undefined,
    };

    onSave(rule);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#0b132c] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'modalIn 0.2s ease-out' }}
      >
        <style>{`@keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }`}</style>

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h3 className="text-sm font-black uppercase tracking-widest text-white font-space-grotesk">
            {editingRule ? 'Edit Rule' : 'Add Rule'}
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* IF - Trigger Field */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#2563eb]">IF Field</span>
            <select
              value={triggerFieldId}
              onChange={(e) => setTriggerFieldId(e.target.value)}
              className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#2563eb]/40"
            >
              {fields.map(f => (
                <option key={f.id} value={f.id} className="bg-[#0b132c] text-white">{f.label} ({f.type})</option>
              ))}
            </select>
          </div>

          {/* Operator & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Condition</span>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as LogicRule['operator'])}
                className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#2563eb]/40"
              >
                <option value="equals" className="bg-[#0b132c]">Equals</option>
                <option value="not_equals" className="bg-[#0b132c]">Not Equals</option>
                <option value="contains" className="bg-[#0b132c]">Contains</option>
                <option value="checked" className="bg-[#0b132c]">Is Checked</option>
                <option value="unchecked" className="bg-[#0b132c]">Is Unchecked</option>
                <option value="greater_than" className="bg-[#0b132c]">&gt; Greater Than</option>
                <option value="less_than" className="bg-[#0b132c]">&lt; Less Than</option>
                <option value="length_greater_than" className="bg-[#0b132c]">&gt; Longer Than (characters)</option>
                <option value="length_less_than" className="bg-[#0b132c]">&lt; Shorter Than (characters)</option>
              </select>
            </div>
            {needsValue && (
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Value</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#2563eb]/40"
                  placeholder="Compare value..."
                />
              </div>
            )}
          </div>

          {/* THEN - Action */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-white/5">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#2563eb]">THEN</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">Action</span>
                <select
                  value={action}
                  onChange={(e) => {
                    const nextAction = e.target.value as LogicRule['action'];
                    setAction(nextAction);
                    // Reset target when switching between field/step actions
                    if (nextAction === 'skip_step') {
                      setTargetId(steps[0]?.id || '');
                    } else {
                      setTargetId(fields.find(f => f.id !== triggerFieldId)?.id || fields[0]?.id || '');
                    }
                  }}
                  className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#2563eb]/40"
                >
                  <option value="show_field" className="bg-[#0b132c]">Show Field</option>
                  <option value="hide_field" className="bg-[#0b132c]">Hide Field</option>
                  <option value="skip_step" className="bg-[#0b132c]">Skip Step</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                  {isStepAction ? 'Target Step' : 'Target Field'}
                </span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-[#2563eb]/40"
                >
                  {filteredTargets.map(t => (
                    <option key={t.id} value={t.id} className="bg-[#0b132c]">{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          {/* Validation error */}
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-[10px] text-rose-400 font-dm-sans">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white/40 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <Save size={11} /> {editingRule ? 'Update' : 'Add'} Rule
          </button>
        </div>
      </div>
    </div>
  );
}
