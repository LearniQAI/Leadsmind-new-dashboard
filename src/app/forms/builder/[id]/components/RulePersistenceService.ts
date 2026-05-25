import { LogicRule } from './LogicEngine';

const STORAGE_PREFIX = 'lm_form_rules_';

export function saveRulesToLocal(formId: string, rules: LogicRule[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${formId}`, JSON.stringify(rules));
  } catch {
    console.warn('[RulePersistence] Could not save to localStorage');
  }
}

export function loadRulesFromLocal(formId: string): LogicRule[] | null {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${formId}`);
    if (!raw) return null;
    return JSON.parse(raw) as LogicRule[];
  } catch {
    return null;
  }
}

export function clearLocalRules(formId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${formId}`);
  } catch {
    // silently ignore
  }
}

export function extractRulesFromConfig(config: Record<string, any>): LogicRule[] {
  if (config && Array.isArray(config.logicRules)) {
    return config.logicRules;
  }
  return [];
}

export function injectRulesIntoConfig(
  config: Record<string, any>,
  rules: LogicRule[]
): Record<string, any> {
  return {
    ...config,
    logicRules: rules,
  };
}

export function validateRule(rule: Partial<LogicRule>): string | null {
  if (!rule.triggerFieldId) return 'Please select a trigger field.';
  if (!rule.operator) return 'Please select a condition operator.';
  if (rule.operator !== 'checked' && rule.operator !== 'unchecked' && !rule.value?.trim()) {
    return 'Please enter a comparison value.';
  }
  if (!rule.action) return 'Please select an action.';
  if (!rule.targetId) return 'Please select a target field or step.';
  if (rule.triggerFieldId === rule.targetId && rule.action !== 'skip_step') {
    return 'Trigger and target fields must be different.';
  }
  return null;
}
