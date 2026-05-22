export interface LogicRule {
  id: string;
  triggerFieldId: string;
  operator: 'equals' | 'not_equals' | 'checked' | 'unchecked' | 'contains' | 'greater_than' | 'less_than' | 'length_greater_than' | 'length_less_than';
  value: string;
  action: 'show_field' | 'hide_field' | 'jump_to_step' | 'set_value' | 'skip_step';
  targetId: string;
  targetValue?: string;
}

export interface LogicEvalResult {
  hiddenFieldIds: Set<string>;
  overriddenValues: Record<string, any>;
  jumpToStepId: string | null;
  skipStepIds: Set<string>;
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
    case 'length_greater_than': {
      const numExpected = parseInt(expectedVal, 10);
      return !isNaN(numExpected) && triggerStr.length > numExpected;
    }
    case 'length_less_than': {
      const numExpected = parseInt(expectedVal, 10);
      // We also verify it has a value, otherwise empty strings might trigger it unintentionally?
      // standard logic: if length is < 5, an empty string has length 0 which is < 5.
      return !isNaN(numExpected) && triggerStr.length < numExpected;
    }
    default:
      return false;
  }
}

export function evaluateLogicRules(
  rules: LogicRule[],
  values: Record<string, any>
): LogicEvalResult {
  const hiddenFieldIds = new Set<string>();
  const overriddenValues: Record<string, any> = {};
  const skipStepIds = new Set<string>();
  let jumpToStepId: string | null = null;

  for (const rule of rules) {
    const triggerVal = values[rule.triggerFieldId];
    const isMatched = evaluateCondition(triggerVal, rule.operator, rule.value);

    if (isMatched) {
      switch (rule.action) {
        case 'hide_field':
          hiddenFieldIds.add(rule.targetId);
          break;
        case 'show_field':
          break;
        case 'set_value':
          overriddenValues[rule.targetId] = rule.targetValue || '';
          break;
        case 'skip_step':
          skipStepIds.add(rule.targetId);
          break;
      }
    }
  }

  // Handle default hidden states for 'show_field' rules
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

  for (const fieldId of fieldsWithShowRules) {
    if (!matchingShowRules.has(fieldId)) {
      hiddenFieldIds.add(fieldId);
    }
  }

  // Determine first matched jump_to_step
  for (const rule of rules) {
    if (rule.action === 'jump_to_step') {
      const triggerVal = values[rule.triggerFieldId];
      if (evaluateCondition(triggerVal, rule.operator, rule.value)) {
        jumpToStepId = rule.targetId;
        break;
      }
    }
  }

  return {
    hiddenFieldIds,
    overriddenValues,
    jumpToStepId,
    skipStepIds,
  };
}
