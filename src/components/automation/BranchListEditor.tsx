'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput } from '@/components/dashboard-ui/FormField';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

// Mirrors src/lib/automation/condition_evaluator.ts's real Condition/Branch
// types exactly (field/operator/value evaluated against a raw contact
// object) — NOT SegmentationCompiler's RuleGroup, which is SQL-compiled and
// has a different operator set. This is the type resolveWinningBranch()
// (called from executor.ts's 'route' step) actually reads.
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists' | 'greater_than' | 'less_than' | 'is_between';
export interface BranchCondition { field: string; operator: ConditionOperator; value?: string }
export interface RouteBranch { name: string; is_default?: boolean; conditions: BranchCondition[] }

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'is' },
  { value: 'not_equals', label: 'is not' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'exists', label: 'exists' },
  { value: 'not_exists', label: 'does not exist' },
  { value: 'greater_than', label: 'is greater than' },
  { value: 'less_than', label: 'is less than' },
  { value: 'is_between', label: 'is between (min,max)' },
];

interface StepOption { position: number; label: string }

export function RouteBranchEditor({
  branches, onChange, stepOptions, targets, onTargetsChange,
}: {
  branches: RouteBranch[];
  onChange: (branches: RouteBranch[]) => void;
  stepOptions: StepOption[];
  targets: Record<string, number | null>; // branch name (or 'default') -> target step position
  onTargetsChange: (targets: Record<string, number | null>) => void;
}) {
  const addBranch = () => {
    onChange([...branches, { name: `Branch ${branches.length + 1}`, conditions: [] }]);
  };
  const removeBranch = (idx: number) => {
    const removed = branches[idx];
    onChange(branches.filter((_, i) => i !== idx));
    const nextTargets = { ...targets };
    delete nextTargets[removed.is_default ? 'default' : removed.name];
    onTargetsChange(nextTargets);
  };
  const updateBranch = (idx: number, patch: Partial<RouteBranch>) => {
    onChange(branches.map((b, i) => (i === idx ? { ...b, ...patch } : b)));
  };
  const addCondition = (idx: number) => {
    updateBranch(idx, { conditions: [...branches[idx].conditions, { field: 'tags', operator: 'equals', value: '' }] });
  };
  const updateCondition = (idx: number, cIdx: number, patch: Partial<BranchCondition>) => {
    const conditions = branches[idx].conditions.map((c, i) => (i === cIdx ? { ...c, ...patch } : c));
    updateBranch(idx, { conditions });
  };
  const removeCondition = (idx: number, cIdx: number) => {
    updateBranch(idx, { conditions: branches[idx].conditions.filter((_, i) => i !== cIdx) });
  };

  const targetKey = (b: RouteBranch) => (b.is_default ? 'default' : b.name);

  return (
    <div className="space-y-3">
      {branches.map((branch, idx) => (
        <div key={idx} className="p-3 border border-dash-border rounded-xl space-y-2 bg-dash-surface">
          <div className="flex items-center gap-2">
            <DashInput
              value={branch.name}
              onChange={(e) => updateBranch(idx, { name: e.target.value })}
              placeholder="Branch name"
              className="h-9 flex-1 text-[12px]"
              disabled={!!branch.is_default}
            />
            <label className="flex items-center gap-1.5 text-[11px] font-bold !text-dash-textMuted shrink-0">
              <input
                type="checkbox"
                checked={!!branch.is_default}
                onChange={(e) => updateBranch(idx, { is_default: e.target.checked, name: e.target.checked ? 'Default' : branch.name })}
              />
              Default (fallback)
            </label>
            <button type="button" onClick={() => removeBranch(idx)} className="h-9 w-9 shrink-0 rounded-xl border border-dash-border !text-dash-textMuted hover:text-red flex items-center justify-center">
              <Trash2 size={13} />
            </button>
          </div>

          {!branch.is_default && (
            <div className="space-y-2">
              {branch.conditions.map((cond, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2">
                  <DashInput value={cond.field} onChange={(e) => updateCondition(idx, cIdx, { field: e.target.value })} placeholder="contact field (e.g. lead_score, tags)" className="h-9 flex-1 text-[12px]" />
                  <Select value={cond.operator} onValueChange={(v) => updateCondition(idx, cIdx, { operator: v as ConditionOperator })}>
                    <SelectTrigger className="h-9 w-[170px] border-dash-border rounded-xl text-[12px]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                      {OPERATORS.map((op) => <SelectItem key={op.value} value={op.value} className="text-[12px]">{op.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {cond.operator !== 'exists' && cond.operator !== 'not_exists' && (
                    <DashInput value={cond.value ?? ''} onChange={(e) => updateCondition(idx, cIdx, { value: e.target.value })} placeholder="value" className="h-9 flex-1 text-[12px]" />
                  )}
                  <button type="button" onClick={() => removeCondition(idx, cIdx)} className="h-9 w-9 shrink-0 rounded-xl border border-dash-border !text-dash-textMuted hover:text-red flex items-center justify-center">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <DashButton type="button" variant="secondary" size="sm" onClick={() => addCondition(idx)}>
                <Plus size={12} /> Add condition
              </DashButton>
            </div>
          )}

          <div className="pt-1">
            <label className="text-[11px] font-bold !text-dash-textMuted block mb-1">Go to step</label>
            <Select
              value={targets[targetKey(branch)] != null ? String(targets[targetKey(branch)]) : undefined}
              onValueChange={(v) => onTargetsChange({ ...targets, [targetKey(branch)]: Number(v) })}
            >
              <SelectTrigger className="h-9 w-full border-dash-border rounded-xl text-[12px]"><SelectValue placeholder="Select target step" /></SelectTrigger>
              <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                {stepOptions.map((s) => <SelectItem key={s.position} value={String(s.position)} className="text-[12px]">{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      <DashButton type="button" variant="secondary" size="sm" onClick={addBranch}>
        <Plus size={13} /> Add branch
      </DashButton>
    </div>
  );
}

export function SplitEditor({
  splitPercentage, onSplitPercentageChange, stepOptions, targetA, targetB, onTargetAChange, onTargetBChange,
}: {
  splitPercentage: number;
  onSplitPercentageChange: (v: number) => void;
  stepOptions: StepOption[];
  targetA: number | null;
  targetB: number | null;
  onTargetAChange: (v: number | null) => void;
  onTargetBChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[11px] font-bold !text-dash-textMuted block mb-1">Percentage to Variant A</label>
        <DashInput type="number" min={0} max={100} value={splitPercentage} onChange={(e) => onSplitPercentageChange(Number(e.target.value))} className="h-9 w-32 text-[12px]" />
      </div>
      <div>
        <label className="text-[11px] font-bold !text-dash-textMuted block mb-1">Variant A goes to</label>
        <Select value={targetA != null ? String(targetA) : undefined} onValueChange={(v) => onTargetAChange(Number(v))}>
          <SelectTrigger className="h-9 w-full border-dash-border rounded-xl text-[12px]"><SelectValue placeholder="Select target step" /></SelectTrigger>
          <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
            {stepOptions.map((s) => <SelectItem key={s.position} value={String(s.position)} className="text-[12px]">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-[11px] font-bold !text-dash-textMuted block mb-1">Variant B goes to</label>
        <Select value={targetB != null ? String(targetB) : undefined} onValueChange={(v) => onTargetBChange(Number(v))}>
          <SelectTrigger className="h-9 w-full border-dash-border rounded-xl text-[12px]"><SelectValue placeholder="Select target step" /></SelectTrigger>
          <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
            {stepOptions.map((s) => <SelectItem key={s.position} value={String(s.position)} className="text-[12px]">{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
