'use client';

import React, { useState } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { LogicRule } from './LogicEngine';
import { RuleBuilderModal } from './RuleBuilderModal';
import { Plus, Trash2, Pencil, Sparkles, ArrowRight, Eye, EyeOff, SkipForward } from 'lucide-react';
import { toast } from 'sonner';

const ACTION_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  show_field: { label: 'Show Field', icon: <Eye size={10} /> },
  hide_field: { label: 'Hide Field', icon: <EyeOff size={10} /> },
  skip_step: { label: 'Skip Step', icon: <SkipForward size={10} /> },
};

export function LogicBuilder() {
  const { state, dispatch } = useFormBuilder();
  const { fields, steps, logicRules } = state;
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<LogicRule | null>(null);

  const handleOpenNew = () => {
    if (fields.length === 0) {
      toast.error('Add at least one field to your form before creating a conditional rule.', { id: 'no-fields-rule' });
      return;
    }
    setEditingRule(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: LogicRule) => {
    setEditingRule(rule);
    setModalOpen(true);
  };

  const handleSaveRule = (rule: LogicRule) => {
    if (editingRule) {
      dispatch({ type: 'UPDATE_LOGIC_RULE', id: rule.id, updates: rule });
    } else {
      dispatch({ type: 'ADD_LOGIC_RULE', rule });
    }
    setModalOpen(false);
    setEditingRule(null);
  };

  const handleRemoveRule = (id: string) => {
    dispatch({ type: 'REMOVE_LOGIC_RULE', id });
  };

  const handleUseStarter = (triggerLabel: string, action: LogicRule['action']) => {
    if (fields.length < 2) {
      toast.error('Add at least two fields to use quick-start examples.', { id: 'no-fields-starter' });
      return;
    }
    const triggerField = fields.find(f => f.label.toLowerCase().includes(triggerLabel.toLowerCase())) || fields[0];
    const targetField = fields.find(f => f.id !== triggerField.id) || fields[1];
    const rule: LogicRule = {
      id: `rule_${Date.now()}`,
      triggerFieldId: triggerField.id,
      operator: 'equals',
      value: triggerLabel === 'Company' ? 'Company' : 'Free',
      action,
      targetId: action === 'skip_step' ? (steps[1]?.id || steps[0]?.id || '') : targetField.id,
    };
    dispatch({ type: 'ADD_LOGIC_RULE', rule });
  };

  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const stepMap = new Map(steps.map(s => [s.id, s]));

  return (
    <div className="flex flex-col gap-6" style={{ padding: '8px 0 20px' }}>
      <div className="flex items-center justify-between">
        <p className="builder-section-label" style={{ margin: 0 }}>Conditional Rules</p>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 hover:bg-[#2563eb] hover:border-transparent text-[#60a5fa] hover:text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
        >
          <Plus size={10} /> Add Rule
        </button>
      </div>

      {logicRules.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="text-center py-10 bg-white/2 border border-dashed border-white/5 rounded-2xl p-4">
            <p className="text-xs text-white/30 font-dm-sans leading-relaxed">
              No conditional logic rules yet. Rules let you show, hide, or skip based on user responses.
            </p>
            <button
              onClick={() => { if (fields.length === 0) { toast.error('Add at least one field first.', { id: 'no-fields-first' }); return; } setEditingRule(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563eb]/10 border border-[#2563eb]/20 hover:bg-[#2563eb] text-[#60a5fa] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              <Plus size={10} /> Add Your First Rule
            </button>
          </div>

          {fields.length >= 2 && (
            <div className="flex flex-col gap-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                <Sparkles size={10} /> Quick Start Examples
              </p>
              <button
                onClick={() => handleUseStarter('Company', 'show_field')}
                className="text-left p-3 bg-white/3 border border-white/5 hover:border-[#2563eb]/20 rounded-xl transition-all text-[10px] text-white/50 hover:text-white font-dm-sans leading-relaxed"
              >
                <span className="block text-[10px] font-bold text-white/60 mb-0.5">Show business fields when &quot;Company&quot; selected</span>
                <span className="block text-[9px] text-[#4a5a82]">IF [dropdown] equals &quot;Company&quot; THEN Show Field</span>
              </button>
              <button
                onClick={() => handleUseStarter('Free', 'skip_step')}
                className="text-left p-3 bg-white/3 border border-white/5 hover:border-[#2563eb]/20 rounded-xl transition-all text-[10px] text-white/50 hover:text-white font-dm-sans leading-relaxed"
              >
                <span className="block text-[10px] font-bold text-white/60 mb-0.5">Skip payment step for free plans</span>
                <span className="block text-[9px] text-[#4a5a82]">IF [dropdown] equals &quot;Free&quot; THEN Skip Step</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {logicRules.map((rule) => {
            const triggerField = fieldMap.get(rule.triggerFieldId);
            const targetField = fieldMap.get(rule.targetId);
            const targetStep = stepMap.get(rule.targetId);
            const actionMeta = ACTION_LABELS[rule.action] || { label: rule.action, icon: null };
            const isStepAction = rule.action === 'skip_step' || rule.action === 'jump_to_step';
            const targetLabel = isStepAction
              ? (targetStep?.title || 'Unknown Step')
              : (targetField?.label || 'Unknown Field');

            return (
              <div
                key={rule.id}
                className="p-4 bg-[#0c1535]/80 border border-white/5 rounded-2xl relative group hover:border-[#2563eb]/20 transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] text-white font-bold font-dm-sans mb-2 flex-wrap">
                      <span className="text-[#2563eb] text-[10px] font-black uppercase tracking-widest">IF</span>
                      <span className="truncate max-w-[120px]">{triggerField?.label || 'Unknown'}</span>
                      <span className="text-[#94a3c8] text-[10px] uppercase tracking-wider">{rule.operator.replace(/_/g, ' ')}</span>
                      {rule.operator !== 'checked' && rule.operator !== 'unchecked' && (
                        <span className="text-white/70 truncate max-w-[100px]">&quot;{rule.value}&quot;</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-white font-bold font-dm-sans flex-wrap">
                      <span className="text-[#2563eb] text-[10px] font-black uppercase tracking-widest">THEN</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-md text-[10px]">
                        {actionMeta.icon}
                        {actionMeta.label}
                      </span>
                      <ArrowRight size={10} className="text-white/30" />
                      <span className="truncate max-w-[140px]">{targetLabel}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-white/5 rounded text-white/30 hover:text-white transition-all"
                      title="Edit Rule"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded text-rose-400 hover:text-rose-500 transition-all"
                      title="Remove Rule"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <RuleBuilderModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingRule(null); }}
        onSave={handleSaveRule}
        fields={fields}
        steps={steps}
        editingRule={editingRule}
      />
    </div>
  );
}
