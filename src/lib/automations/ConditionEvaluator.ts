/**
 * ConditionEvaluator — evaluates branching conditions for LeadsMind workflows.
 */

export interface ConditionRule {
  type: 'field_value' | 'payment_status' | 'completion_percentage' | 'utm_source' | 'device_type' | 'returning_visitor';
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  fieldKey?: string;
  value: string;
}

export interface EvaluationPayload {
  values: Record<string, any>;
  completionPercentage?: number;
  attribution?: Record<string, any>;
  isReturningContact?: boolean;
  metadata?: Record<string, any>;
}

export const ConditionEvaluator = {
  /**
   * Evaluates if a set of condition rules matches the runtime payload.
   */
  evaluate(rules: ConditionRule[], payload: EvaluationPayload): boolean {
    if (!rules || rules.length === 0) return true;

    // By default, conditions inside a step are evaluated as AND
    return rules.every(rule => {
      const actualValue = this.extractValue(rule, payload);
      return this.compare(actualValue, rule.operator, rule.value);
    });
  },

  /**
   * Extract target value from the payload based on condition type.
   */
  extractValue(rule: ConditionRule, payload: EvaluationPayload): any {
    switch (rule.type) {
      case 'field_value':
        return rule.fieldKey ? payload.values[rule.fieldKey] : undefined;
      
      case 'payment_status':
        return payload.values.payment_status || payload.metadata?.payment_status || 'unpaid';
      
      case 'completion_percentage':
        return payload.completionPercentage ?? 0;
      
      case 'utm_source':
        return payload.attribution?.utm_source || payload.attribution?.source || '';
      
      case 'device_type':
        return payload.metadata?.deviceType || payload.metadata?.userAgent || '';
      
      case 'returning_visitor':
        return payload.isReturningContact ? 'true' : 'false';

      default:
        return undefined;
    }
  },

  /**
   * Performs standard comparison operators.
   */
  compare(actual: any, operator: ConditionRule['operator'], expected: string): boolean {
    const actStr = String(actual || '').toLowerCase().trim();
    const expStr = String(expected || '').toLowerCase().trim();

    switch (operator) {
      case 'equals':
        return actStr === expStr;
      
      case 'not_equals':
        return actStr !== expStr;
      
      case 'contains':
        return actStr.includes(expStr);

      case 'greater_than': {
        const actNum = parseFloat(actual);
        const expNum = parseFloat(expected);
        return !isNaN(actNum) && !isNaN(expNum) && actNum > expNum;
      }

      case 'less_than': {
        const actNum = parseFloat(actual);
        const expNum = parseFloat(expected);
        return !isNaN(actNum) && !isNaN(expNum) && actNum < expNum;
      }

      default:
        return false;
    }
  }
};
