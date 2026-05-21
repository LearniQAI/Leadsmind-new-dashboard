import { useMemo, useCallback } from 'react';
import { LogicRule } from './LogicEngine';
import { FormField, FormStep } from './FormBuilderContext';
import { evaluateRulesSafely } from './RuleEvaluator';

interface LogicRuntimeOptions {
  rules: LogicRule[];
  values: Record<string, any>;
  fields: FormField[];
  steps: FormStep[];
  currentStepIndex: number;
}

export interface LogicRuntimeResult {
  hiddenFieldIds: Set<string>;
  skipStepIds: Set<string>;
  jumpToStepId: string | null;
  overriddenValues: Record<string, any>;
  isStepSkipped: boolean;
  currentStepFields: FormField[];
  activeRuleCount: number;
  isFieldHidden: (fieldId: string) => boolean;
  isStepSkippedById: (stepId: string) => boolean;
  getSkippedStepIndices: () => number[];
}

function matchCondition(
  triggerVal: any,
  operator: LogicRule['operator'],
  expectedVal: string
): boolean {
  const triggerStr = triggerVal === undefined || triggerVal === null ? '' : String(triggerVal);
  switch (operator) {
    case 'equals': return triggerStr.toLowerCase() === expectedVal.toLowerCase();
    case 'not_equals': return triggerStr.toLowerCase() !== expectedVal.toLowerCase();
    case 'checked': return triggerVal === true || triggerStr === 'true';
    case 'unchecked': return triggerVal === false || triggerStr === 'false' || !triggerVal;
    case 'contains': return triggerStr.toLowerCase().includes(expectedVal.toLowerCase());
    case 'greater_than': { const n = parseFloat(triggerStr); const e = parseFloat(expectedVal); return !isNaN(n) && !isNaN(e) && n > e; }
    case 'less_than': { const n = parseFloat(triggerStr); const e = parseFloat(expectedVal); return !isNaN(n) && !isNaN(e) && n < e; }
    default: return false;
  }
}

export function useLogicRuntime({
  rules,
  values,
  fields,
  steps,
  currentStepIndex,
}: LogicRuntimeOptions): LogicRuntimeResult {
  const evalOptions = useMemo(() => ({
    fields: fields.map(f => ({ id: f.id, stepId: f.stepId })),
    steps: steps.map(s => ({ id: s.id })),
  }), [fields, steps]);

  const evalResult = useMemo(
    () => evaluateRulesSafely(rules, values, evalOptions),
    [rules, values, evalOptions]
  );

  const currentStep = steps[currentStepIndex];

  const currentStepFields = useMemo(() => {
    if (!currentStep) return [];
    return fields.filter(f => f.stepId === currentStep.id);
  }, [fields, currentStep]);

  const isStepSkipped = currentStep ? evalResult.skipStepIds.has(currentStep.id) : false;

  const activeRuleCount = useMemo(() => {
    let count = 0;
    for (const rule of rules) {
      const triggerVal = values[rule.triggerFieldId];
      if (matchCondition(triggerVal, rule.operator, rule.value)) count++;
    }
    return count;
  }, [rules, values]);

  const isFieldHidden = useCallback(
    (fieldId: string) => evalResult.hiddenFieldIds.has(fieldId),
    [evalResult.hiddenFieldIds]
  );

  const isStepSkippedById = useCallback(
    (stepId: string) => evalResult.skipStepIds.has(stepId),
    [evalResult.skipStepIds]
  );

  const getSkippedStepIndices = useCallback(
    () => steps.reduce<number[]>((acc, s, i) => {
      if (evalResult.skipStepIds.has(s.id)) acc.push(i);
      return acc;
    }, []),
    [steps, evalResult.skipStepIds]
  );

  return {
    hiddenFieldIds: evalResult.hiddenFieldIds,
    skipStepIds: evalResult.skipStepIds,
    jumpToStepId: evalResult.jumpToStepId,
    overriddenValues: evalResult.overriddenValues,
    isStepSkipped,
    currentStepFields,
    activeRuleCount,
    isFieldHidden,
    isStepSkippedById,
    getSkippedStepIndices,
  };
}
