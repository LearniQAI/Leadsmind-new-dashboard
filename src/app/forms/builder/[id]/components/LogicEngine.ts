export interface LogicRule {
  id: string;
  triggerFieldId: string;
  operator: 'equals' | 'not_equals' | 'checked' | 'unchecked' | 'contains' | 'greater_than' | 'less_than';
  value: string;
  action: 'show_field' | 'hide_field' | 'jump_to_step' | 'set_value';
  targetId: string;
  targetValue?: string;
}

export function evaluateCondition(
  triggerVal: any,
  operator: LogicRule['operator'],
  expectedVal: string
): boolean {
  const triggerStr = triggerVal === undefined || triggerVal === null ? '' : String(triggerVal);

  switch (operator) {
    case 'equals':
      return triggerStr.toLowerCase() === expectedVal.toLowerCase();
    case 'not_equals':
      return triggerStr.toLowerCase() !== expectedVal.toLowerCase();
    case 'checked':
      return triggerVal === true || triggerStr === 'true';
    case 'unchecked':
      return triggerVal === false || triggerStr === 'false' || !triggerVal;
    case 'contains':
      return triggerStr.toLowerCase().includes(expectedVal.toLowerCase());
    case 'greater_than': {
      const numTrigger = parseFloat(triggerStr);
      const numExpected = parseFloat(expectedVal);
      return !isNaN(numTrigger) && !isNaN(numExpected) && numTrigger > numExpected;
    }
    case 'less_than': {
      const numTrigger = parseFloat(triggerStr);
      const numExpected = parseFloat(expectedVal);
      return !isNaN(numTrigger) && !isNaN(numExpected) && numTrigger < numExpected;
    }
    default:
      return false;
  }
}

export function evaluateLogicRules(
  rules: LogicRule[],
  values: Record<string, any>
) {
  const hiddenFieldIds = new Set<string>();
  const jumpToStepId: string | null = null;
  const overriddenValues: Record<string, any> = {};

  // Track field triggers
  for (const rule of rules) {
    const triggerVal = values[rule.triggerFieldId];
    const isMatched = evaluateCondition(triggerVal, rule.operator, rule.value);

    if (isMatched) {
      if (rule.action === 'hide_field') {
        hiddenFieldIds.add(rule.targetId);
      } else if (rule.action === 'show_field') {
        // Handled below: fields that have show rules will be hidden by default 
        // unless their show rules match.
      } else if (rule.action === 'set_value') {
        overriddenValues[rule.targetId] = rule.targetValue || '';
      }
    }
  }

  // Handle default hidden states for fields that have 'show_field' rules
  const fieldsWithShowRules = new Set<string>();
  const matchingShowRules = new Set<string>();

  for (const rule of rules) {
    if (rule.action === 'show_field') {
      fieldsWithShowRules.add(rule.targetId);
      const triggerVal = values[rule.triggerFieldId];
      if (evaluateCondition(triggerVal, rule.operator, rule.value)) {
        matchingShowRules.add(rule.targetId);
      }
    }
  }

  // If a field has a 'show_field' rule but NONE are matched, we hide it by default
  for (const fieldId of fieldsWithShowRules) {
    if (!matchingShowRules.has(fieldId)) {
      hiddenFieldIds.add(fieldId);
    }
  }

  // Determine if there is any jump_to_step rule matched
  let activeJumpStepId: string | null = null;
  for (const rule of rules) {
    if (rule.action === 'jump_to_step') {
      const triggerVal = values[rule.triggerFieldId];
      if (evaluateCondition(triggerVal, rule.operator, rule.value)) {
        activeJumpStepId = rule.targetId;
        break; // First match wins
      }
    }
  }

  return {
    hiddenFieldIds,
    overriddenValues,
    jumpToStepId: activeJumpStepId,
  };
}
