'use client';

import React, { useState } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { useRuntimeForm } from './RuntimeStore';
import { useLogicRuntime } from './LogicRuntimeHandler';
import { LogicRule } from './LogicEngine';
import { Sliders } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ActiveRuleIndicator() {
  const { state } = useFormBuilder();
  const { logicRules } = state;
  const [showPanel, setShowPanel] = useState(false);

  if (logicRules.length === 0) return null;

  return <ActiveRuleIndicatorInner logicRules={logicRules} showPanel={showPanel} setShowPanel={setShowPanel} />;
}

function ActiveRuleIndicatorInner({
  logicRules,
  showPanel,
  setShowPanel,
}: {
  logicRules: LogicRule[];
  showPanel: boolean;
  setShowPanel: (v: boolean) => void;
}) {
  const { state: formState } = useFormBuilder();
  const { state: runtimeState } = useRuntimeForm();

  const logicResult = useLogicRuntime({
    rules: logicRules,
    values: runtimeState.values,
    fields: formState.fields,
    steps: formState.steps,
    currentStepIndex: runtimeState.currentStepIndex,
  });

  const activeRules = logicRules.filter(rule => {
    const triggerVal = runtimeState.values[rule.triggerFieldId];
    const strVal = triggerVal === undefined || triggerVal === null ? '' : String(triggerVal);
    switch (rule.operator) {
      case 'equals': return strVal.toLowerCase() === rule.value.toLowerCase();
      case 'not_equals': return strVal.toLowerCase() !== rule.value.toLowerCase();
      case 'contains': return strVal.toLowerCase().includes(rule.value.toLowerCase());
      case 'checked': return triggerVal === true || strVal === 'true';
      case 'unchecked': return triggerVal === false || strVal === 'false' || !triggerVal;
      case 'greater_than': return parseFloat(strVal) > parseFloat(rule.value);
      case 'less_than': return parseFloat(strVal) < parseFloat(rule.value);
      case 'length_greater_than': return strVal.length > parseInt(rule.value, 10);
      case 'length_less_than': return strVal.length < parseInt(rule.value, 10);
      default: return false;
    }
  });

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dash-border hover:border-dash-accent/40 rounded-lg transition-colors motion-reduce:transition-none"
      >
        <Sliders size={11} className="text-dash-accent" />
        <span className="text-[10px] font-bold !text-dash-textMuted">
          {activeRules.length}/{logicRules.length} active
        </span>
      </button>

      {showPanel && (
        <div className="absolute top-full right-0 mt-2 w-72 bg-white border border-dash-border rounded-2xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none">
          <div className="px-4 py-3 border-b border-dash-border">
            <p className="text-[10px] font-bold !text-dash-textMuted">
              Active rules ({activeRules.length}/{logicRules.length})
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {logicRules.map(rule => {
              const isActive = activeRules.includes(rule);
              const triggerLabel = formState.fields.find(f => f.id === rule.triggerFieldId)?.label || rule.triggerFieldId;
              const targetLabel = rule.action === 'skip_step'
                ? formState.steps.find(s => s.id === rule.targetId)?.title || rule.targetId
                : formState.fields.find(f => f.id === rule.targetId)?.label || rule.targetId;

              return (
                <div key={rule.id} className={cn("px-4 py-2.5 border-b border-dash-border last:border-none", isActive && "bg-dash-accent/5")}>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-green" : "bg-dash-border")} />
                    <span className="!text-dash-text font-bold truncate">{triggerLabel}</span>
                    <span className="!text-dash-textMuted text-[9px]">{rule.operator.replace(/_/g, ' ')}</span>
                    {rule.operator !== 'checked' && rule.operator !== 'unchecked' && (
                      <span className="!text-dash-textMuted truncate">&quot;{rule.value}&quot;</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 ml-3.5 text-[9px] !text-dash-textMuted">
                    <span>→ {rule.action.replace(/_/g, ' ')}</span>
                    <span className="!text-dash-text">{targetLabel}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
