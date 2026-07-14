'use client';

import React, { useState, useEffect } from 'react';
import { LogicRule } from './LogicEngine';
import { FormField, FormStep } from './FormBuilderContext';
import { Save } from 'lucide-react';
import { validateRule } from './RulePersistenceService';
import { DashModal, DashModalContent, DashModalHeader, DashModalTitle, DashModalFooter } from '@/components/dashboard-ui/Modal';
import { DashButton } from '@/components/dashboard-ui/Button';

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

  const selectClass = "w-full h-9 px-3 bg-white border border-dash-border rounded-xl !text-dash-text text-xs focus:outline-none focus:border-dash-accent";
  const fieldLabelClass = "text-[10px] font-bold !text-dash-textMuted";

  return (
    <DashModal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DashModalContent className="max-w-md p-0 overflow-hidden max-h-[90vh]">
        <DashModalHeader className="px-6 py-4 border-b border-dash-border">
          <DashModalTitle>
            {editingRule ? 'Edit rule' : 'Add rule'}
          </DashModalTitle>
        </DashModalHeader>

        <div className="p-6 flex flex-col gap-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* IF - Trigger Field */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold text-dash-accent">IF field</span>
            <select
              value={triggerFieldId}
              onChange={(e) => setTriggerFieldId(e.target.value)}
              className={selectClass}
            >
              {fields.map(f => (
                <option key={f.id} value={f.id}>{f.label} ({f.type})</option>
              ))}
            </select>
          </div>

          {/* Operator & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Condition</span>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value as LogicRule['operator'])}
                className={selectClass}
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not equals</option>
                <option value="contains">Contains</option>
                <option value="checked">Is checked</option>
                <option value="unchecked">Is unchecked</option>
                <option value="greater_than">&gt; Greater than</option>
                <option value="less_than">&lt; Less than</option>
                <option value="length_greater_than">&gt; Longer than (characters)</option>
                <option value="length_less_than">&lt; Shorter than (characters)</option>
              </select>
            </div>
            {needsValue && (
              <div className="flex flex-col gap-1.5">
                <span className={fieldLabelClass}>Value</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className={selectClass}
                  placeholder="Compare value..."
                />
              </div>
            )}
          </div>

          {/* THEN - Action */}
          <div className="flex flex-col gap-1.5 pt-3 border-t border-dash-border">
            <span className="text-[10px] font-bold text-dash-accent">THEN</span>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <span className={fieldLabelClass}>Action</span>
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
                  className={selectClass}
                >
                  <option value="show_field">Show field</option>
                  <option value="hide_field">Hide field</option>
                  <option value="skip_step">Skip step</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className={fieldLabelClass}>
                  {isStepAction ? 'Target step' : 'Target field'}
                </span>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className={selectClass}
                >
                  {filteredTargets.map(t => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>


          {/* Validation error */}
          {error && (
            <div className="p-3 bg-red/10 border border-red/20 rounded-xl">
              <p className="text-[11px] text-red">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <DashModalFooter className="px-6 py-4 border-t border-dash-border">
          <DashButton variant="ghost" onClick={onClose}>
            Cancel
          </DashButton>
          <DashButton onClick={handleSave}>
            <Save size={11} /> {editingRule ? 'Update' : 'Add'} rule
          </DashButton>
        </DashModalFooter>
      </DashModalContent>
    </DashModal>
  );
}
