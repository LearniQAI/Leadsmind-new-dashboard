// Single source of truth for what a segment rule may look like. Pure and
// client-safe (no server imports) so the Segments UI, the server actions and the
// evaluator (SegmentationCompiler — both its SQL and JS paths) all enforce the SAME
// rules. Before this existed each layer accepted whatever it was handed, and the two
// evaluation paths then disagreed in opposite directions (see the Segments audit).

export type RuleOperator = 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';

export interface RuleFieldSpec {
  kind: 'text' | 'number';
  operators: RuleOperator[];
}

// Mirrors the fields SegmentationCompiler.compileToSql() implements AND the fields
// SegmentRuleBuilder offers. Adding a field means adding it here, in the compiler's
// SQL branch, and in its JS branch.
const TEXT_CRM: RuleFieldSpec = { kind: 'text', operators: ['equals', 'not_equals', 'contains'] };
export const SEGMENT_RULE_FIELDS: Record<string, RuleFieldSpec> = {
  first_name: TEXT_CRM,
  last_name: TEXT_CRM,
  email: TEXT_CRM,
  phone: TEXT_CRM,
  source: TEXT_CRM,
  timezone: TEXT_CRM,
  tags: { kind: 'text', operators: ['equals'] },
  invoice_status: { kind: 'text', operators: ['equals', 'not_equals'] },
  outstanding_zar_limit: { kind: 'number', operators: ['greater_than', 'less_than'] },
  lms_course_id: { kind: 'text', operators: ['equals', 'not_equals'] },
  lms_course_status: { kind: 'text', operators: ['equals', 'not_equals'] },
  email_open_count: { kind: 'number', operators: ['greater_than', 'less_than'] },
  email_click_count: { kind: 'number', operators: ['greater_than', 'less_than'] },
};

export class InvalidRuleGroupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidRuleGroupError';
  }
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

/** Validates one rule; returns a user-facing message, or null when valid. */
export function validateRule(rule: any, position?: number): string | null {
  const where = position === undefined ? '' : ` (condition ${position + 1})`;
  if (!rule || typeof rule !== 'object') return `Invalid condition${where}.`;
  const spec = SEGMENT_RULE_FIELDS[String(rule.field)];
  if (!spec) return `Unknown segment field "${String(rule.field)}"${where}.`;
  if (!spec.operators.includes(rule.operator)) {
    return `"${String(rule.operator)}" is not a valid comparison for ${rule.field}${where}.`;
  }
  // A blank value used to match EVERY contact (e.g. "first name contains ''"), and the
  // builder's own default new rule starts blank — so require a real value.
  if (isBlank(rule.value)) return `Enter a value for the ${rule.field} condition${where}.`;
  if (spec.kind === 'number') {
    const n = Number(rule.value);
    if (typeof rule.value === 'boolean' || !Number.isFinite(n)) return `The ${rule.field} condition${where} needs a number.`;
  } else if (typeof rule.value !== 'string') {
    return `The ${rule.field} condition${where} needs a text value.`;
  }
  return null;
}

/** Validates a whole rule group; returns a user-facing message, or null when valid. */
export function validateRuleGroup(ruleGroup: any): string | null {
  if (!ruleGroup || typeof ruleGroup !== 'object') return 'A segment needs at least one condition';
  if (ruleGroup.logic !== 'AND' && ruleGroup.logic !== 'OR') return 'Match logic must be AND or OR.';
  if (!Array.isArray(ruleGroup.rules) || ruleGroup.rules.length === 0) return 'A segment needs at least one condition';
  for (let i = 0; i < ruleGroup.rules.length; i++) {
    const err = validateRule(ruleGroup.rules[i], i);
    if (err) return err;
  }
  return null;
}

/** Throws InvalidRuleGroupError — used by the evaluator so BOTH paths fail identically. */
export function assertValidRuleGroup(ruleGroup: any): void {
  const err = validateRuleGroup(ruleGroup);
  if (err) throw new InvalidRuleGroupError(err);
}
