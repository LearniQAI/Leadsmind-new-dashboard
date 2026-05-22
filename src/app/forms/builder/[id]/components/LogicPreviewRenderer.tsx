'use client';

import React, { useState } from 'react';
import { useFormBuilder } from './FormBuilderContext';
import { useRuntimeForm } from './RuntimeStore';
import { useLogicRuntime } from './LogicRuntimeHandler';
import { LogicRule } from './LogicEngine';
import { EyeOff, SkipForward, Sliders } from 'lucide-react';

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
        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:border-[#2563eb]/20 rounded-lg transition-all"
      >
        <Sliders size={11} className="text-[#60a5fa]" />
        <span className="text-[9px] font-black uppercase tracking-wider text-white/60">
          {activeRules.length}/{logicRules.length} Active
        </span>
      </button>

      {showPanel && (
        <div
          className="absolute top-full right-0 mt-2 w-72 bg-[#0b132c] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{ animation: 'panelIn 0.15s ease-out' }}
        >
          <style>{`@keyframes panelIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/40">
              Active Rules ({activeRules.length}/{logicRules.length})
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {logicRules.map(rule => {
              const isActive = activeRules.includes(rule);
              const triggerLabel = formState.fields.find(f => f.id === rule.triggerFieldId)?.label || rule.triggerFieldId;
              const targetLabel = rule.action === 'skip_step' || rule.action === 'jump_to_step'
                ? formState.steps.find(s => s.id === rule.targetId)?.title || rule.targetId
                : formState.fields.find(f => f.id === rule.targetId)?.label || rule.targetId;

              return (
                <div key={rule.id} className={`px-4 py-2.5 border-b border-white/5 last:border-none ${isActive ? 'bg-[#2563eb]/5' : ''}`}>
                  <div className="flex items-center gap-2 text-[10px]">
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-white/10'}`} />
                    <span className="text-white/70 font-bold truncate">{triggerLabel}</span>
                    <span className="text-white/30 text-[8px] uppercase">{rule.operator.replace(/_/g, ' ')}</span>
                    {rule.operator !== 'checked' && rule.operator !== 'unchecked' && (
                      <span className="text-white/50 truncate">&quot;{rule.value}&quot;</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 ml-3.5 text-[9px] text-white/40">
                    <span>→ {rule.action.replace(/_/g, ' ')}</span>
                    <span className="text-white/60">{targetLabel}</span>
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
