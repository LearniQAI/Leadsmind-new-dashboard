import { LogicRule, LogicEvalResult, evaluateLogicRules } from './LogicEngine';

interface RuleEvalOptions {
  fields: { id: string; stepId: string }[];
  steps: { id: string }[];
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
    case 'length_greater_than': { const e = parseInt(expectedVal, 10); return !isNaN(e) && triggerStr.length > e; }
    case 'length_less_than': { const e = parseInt(expectedVal, 10); return !isNaN(e) && triggerStr.length < e; }
    default: return false;
  }
}

export function evaluateRulesSafely(
  rules: LogicRule[],
  values: Record<string, any>,
  options: RuleEvalOptions
): LogicEvalResult {
  const fieldIds = new Set(options.fields.map(f => f.id));
  const stepIds = new Set(options.steps.map(s => s.id));

  // Filter out rules with invalid targets
  const validRules = rules.filter(rule => {
    if (rule.action === 'skip_step' || rule.action === 'jump_to_step') {
      return stepIds.has(rule.targetId);
    }
    return fieldIds.has(rule.targetId) && fieldIds.has(rule.triggerFieldId);
  });

  const raw = evaluateLogicRules(validRules, values);

  // Conflict resolution: show_field always wins over hide_field
  const showFieldIds = new Set<string>();

  for (const rule of validRules) {
    if (rule.action === 'show_field') {
      const triggerVal = values[rule.triggerFieldId];
      if (matchCondition(triggerVal, rule.operator, rule.value)) {
        showFieldIds.add(rule.targetId);
      }
    }
  }

  const resolvedHidden = new Set(raw.hiddenFieldIds);
  for (const fid of showFieldIds) {
    resolvedHidden.delete(fid);
  }

  // Remove stale hidden field IDs (fields that no longer exist)
  for (const fid of resolvedHidden) {
    if (!fieldIds.has(fid)) {
      resolvedHidden.delete(fid);
    }
  }

  // Clean up skipStepIds: remove any that don't match valid steps
  const resolvedSkip = new Set<string>();
  for (const sid of raw.skipStepIds) {
    if (stepIds.has(sid)) {
      resolvedSkip.add(sid);
    }
  }

  return {
    hiddenFieldIds: resolvedHidden,
    overriddenValues: raw.overriddenValues,
    jumpToStepId: raw.jumpToStepId && stepIds.has(raw.jumpToStepId) ? raw.jumpToStepId : null,
    skipStepIds: resolvedSkip,
  };
}
