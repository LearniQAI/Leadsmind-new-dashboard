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
    <div className="flex flex-col gap-6 py-2 pb-5">
      <div className="flex items-center justify-between">
        <p className="builder-section-label m-0">Conditional rules</p>
        <button
          onClick={handleOpenNew}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-dash-accent/10 border border-dash-accent/20 hover:bg-dash-accent hover:border-transparent text-dash-accent hover:text-white rounded-lg text-[10px] font-bold transition-colors motion-reduce:transition-none cursor-pointer"
        >
          <Plus size={10} /> Add rule
        </button>
      </div>

      {logicRules.length === 0 ? (
        <div className="flex flex-col gap-4">
          <div className="text-center py-10 bg-dash-surface border border-dashed border-dash-border rounded-2xl p-4">
            <p className="text-xs !text-dash-textMuted leading-relaxed">
              No conditional logic rules yet. Rules let you show, hide, or skip based on user responses.
            </p>
            <button
              onClick={() => { if (fields.length === 0) { toast.error('Add at least one field first.', { id: 'no-fields-first' }); return; } setEditingRule(null); setModalOpen(true); }}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-dash-accent/10 border border-dash-accent/20 hover:bg-dash-accent text-dash-accent hover:text-white rounded-xl text-[10px] font-bold transition-colors motion-reduce:transition-none cursor-pointer"
            >
              <Plus size={10} /> Add your first rule
            </button>
          </div>

          {fields.length >= 2 && (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-bold !text-dash-textMuted flex items-center gap-1.5">
                <Sparkles size={10} /> Quick start examples
              </p>
              <button
                onClick={() => handleUseStarter('Company', 'show_field')}
                className="text-left p-3 bg-white border border-dash-border hover:border-dash-accent/30 rounded-xl transition-colors motion-reduce:transition-none text-[10px] !text-dash-textMuted hover:!text-dash-text leading-relaxed"
              >
                <span className="block text-[10px] font-bold !text-dash-text mb-0.5">Show business fields when &quot;Company&quot; selected</span>
                <span className="block text-[9px] !text-dash-textMuted">IF [dropdown] equals &quot;Company&quot; THEN show field</span>
              </button>
              <button
                onClick={() => handleUseStarter('Free', 'skip_step')}
                className="text-left p-3 bg-white border border-dash-border hover:border-dash-accent/30 rounded-xl transition-colors motion-reduce:transition-none text-[10px] !text-dash-textMuted hover:!text-dash-text leading-relaxed"
              >
                <span className="block text-[10px] font-bold !text-dash-text mb-0.5">Skip payment step for free plans</span>
                <span className="block text-[9px] !text-dash-textMuted">IF [dropdown] equals &quot;Free&quot; THEN skip step</span>
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
            const isStepAction = rule.action === 'skip_step';
            const targetLabel = isStepAction
              ? (targetStep?.title || 'Unknown Step')
              : (targetField?.label || 'Unknown Field');

            return (
              <div
                key={rule.id}
                className="p-4 bg-white border border-dash-border rounded-2xl relative group hover:border-dash-accent/30 transition-colors motion-reduce:transition-none"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[11px] !text-dash-text font-bold mb-2 flex-wrap">
                      <span className="text-dash-accent text-[10px] font-bold">IF</span>
                      <span className="truncate max-w-[120px]">{triggerField?.label || 'Unknown'}</span>
                      <span className="!text-dash-textMuted text-[10px]">{rule.operator.replace(/_/g, ' ')}</span>
                      {rule.operator !== 'checked' && rule.operator !== 'unchecked' && (
                        <span className="!text-dash-textMuted truncate max-w-[100px]">&quot;{rule.value}&quot;</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] !text-dash-text font-bold flex-wrap">
                      <span className="text-dash-accent text-[10px] font-bold">THEN</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dash-surface rounded-md text-[10px]">
                        {actionMeta.icon}
                        {actionMeta.label}
                      </span>
                      <ArrowRight size={10} className="!text-dash-textMuted" />
                      <span className="truncate max-w-[140px]">{targetLabel}</span>
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEdit(rule)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-dash-surface rounded !text-dash-textMuted hover:!text-dash-text transition-opacity motion-reduce:transition-none"
                      title="Edit Rule"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleRemoveRule(rule.id)}
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red/10 rounded text-red hover:text-red transition-opacity motion-reduce:transition-none"
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
