'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput } from '@/components/dashboard-ui/FormField';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import type { FilterRule, RuleGroup } from '@/lib/intelligence/SegmentationCompiler';

// Mirrors exactly the 8 rule.field branches SegmentationCompiler.compileToSql()
// implements — adding a field here without a matching branch there (or vice
// versa) will silently no-op that condition, so keep these in sync.
const FIELD_DEFS: {
  value: string;
  label: string;
  valueType: 'text' | 'number';
  operators: FilterRule['operator'][];
}[] = [
  { value: 'first_name', label: 'First name', valueType: 'text', operators: ['equals', 'not_equals', 'contains'] },
  { value: 'last_name', label: 'Last name', valueType: 'text', operators: ['equals', 'not_equals', 'contains'] },
  { value: 'email', label: 'Email', valueType: 'text', operators: ['equals', 'not_equals', 'contains'] },
  { value: 'phone', label: 'Phone', valueType: 'text', operators: ['equals', 'not_equals', 'contains'] },
  { value: 'source', label: 'Source', valueType: 'text', operators: ['equals', 'not_equals', 'contains'] },
  { value: 'timezone', label: 'Timezone', valueType: 'text', operators: ['equals', 'not_equals', 'contains'] },
  { value: 'tags', label: 'Has tag', valueType: 'text', operators: ['equals'] },
  { value: 'invoice_status', label: 'Invoice status', valueType: 'text', operators: ['equals', 'not_equals'] },
  { value: 'outstanding_zar_limit', label: 'Outstanding balance (ZAR)', valueType: 'number', operators: ['greater_than', 'less_than'] },
  { value: 'lms_course_id', label: 'LMS course ID', valueType: 'text', operators: ['equals', 'not_equals'] },
  { value: 'lms_course_status', label: 'LMS course status', valueType: 'text', operators: ['equals', 'not_equals'] },
  { value: 'email_open_count', label: 'Email opens', valueType: 'number', operators: ['greater_than', 'less_than'] },
  { value: 'email_click_count', label: 'Email clicks', valueType: 'number', operators: ['greater_than', 'less_than'] },
];

const OPERATOR_LABELS: Record<FilterRule['operator'], string> = {
  equals: 'is',
  not_equals: 'is not',
  greater_than: 'is greater than',
  less_than: 'is less than',
  contains: 'contains',
  in: 'is one of',
};

function fieldDef(field: string) {
  return FIELD_DEFS.find((f) => f.value === field) || FIELD_DEFS[0];
}

interface SegmentRuleBuilderProps {
  value: RuleGroup | null;
  onChange: (ruleGroup: RuleGroup | null) => void;
}

export function SegmentRuleBuilder({ value, onChange }: SegmentRuleBuilderProps) {
  const ruleGroup: RuleGroup = value || { logic: 'AND', rules: [] };

  const updateRules = (rules: FilterRule[]) => {
    onChange(rules.length > 0 ? { ...ruleGroup, rules } : null);
  };

  const addRule = () => {
    const def = FIELD_DEFS[0];
    updateRules([...ruleGroup.rules, { field: def.value, operator: def.operators[0], value: '' }]);
  };

  const removeRule = (index: number) => {
    updateRules(ruleGroup.rules.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, patch: Partial<FilterRule>) => {
    updateRules(ruleGroup.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const setLogic = (logic: 'AND' | 'OR') => {
    onChange({ ...ruleGroup, logic });
  };

  return (
    <div className="space-y-3">
      {ruleGroup.rules.length > 1 && (
        <div className="flex items-center gap-2 text-[11px] font-bold !text-dash-textMuted">
          Match
          <div className="inline-flex rounded-lg border border-dash-border overflow-hidden">
            {(['AND', 'OR'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLogic(l)}
                className={`px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none ${
                  ruleGroup.logic === l ? 'bg-dash-accent text-white' : 'bg-white !text-dash-textMuted hover:bg-dash-surface'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          of the conditions below
        </div>
      )}

      <div className="space-y-2">
        {ruleGroup.rules.map((rule, index) => {
          const def = fieldDef(rule.field);
          return (
            <div key={index} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Select
                value={rule.field}
                onValueChange={(field) => {
                  const nextDef = fieldDef(field);
                  updateRule(index, { field, operator: nextDef.operators[0] });
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[180px] border-dash-border rounded-xl text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  {FIELD_DEFS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-[12px]">{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={rule.operator}
                onValueChange={(operator) => updateRule(index, { operator: operator as FilterRule['operator'] })}
              >
                <SelectTrigger className="h-10 w-full sm:w-[150px] border-dash-border rounded-xl text-[12px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl">
                  {def.operators.map((op) => (
                    <SelectItem key={op} value={op} className="text-[12px]">{OPERATOR_LABELS[op]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <DashInput
                type={def.valueType === 'number' ? 'number' : 'text'}
                value={rule.value ?? ''}
                onChange={(e) => updateRule(index, { value: def.valueType === 'number' ? e.target.value : e.target.value })}
                placeholder={def.valueType === 'number' ? '0' : 'Value'}
                className="h-10 flex-1 min-w-[120px] text-[12px]"
              />

              <button
                type="button"
                onClick={() => removeRule(index)}
                className="h-10 w-10 shrink-0 rounded-xl border border-dash-border !text-dash-textMuted hover:text-red hover:border-red/40 flex items-center justify-center transition-colors motion-reduce:transition-none"
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <DashButton type="button" variant="secondary" size="sm" onClick={addRule}>
        <Plus size={13} /> Add condition
      </DashButton>
    </div>
  );
}
