/**
 * condition_evaluator.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure, side-effect-free condition evaluation for the Multi-Branch Router.
 * Reuses the same field/operator/value shape as the existing UI condition
 * builder so the router config is consistent with single if/else steps.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'exists'
  | 'not_exists'
  | 'greater_than'
  | 'less_than'
  | 'is_between';

export interface Condition {
  /** The contact field to evaluate, e.g. 'lead_score', 'email', 'tags' */
  field: string;
  operator: ConditionOperator;
  /** Comparison value (not required for 'exists' / 'not_exists') */
  value?: string;
}

export interface Branch {
  /** Human-readable branch name, shown in the execution log */
  name: string;
  /**
   * If true this is the catch-all fallback.
   * Default branches are skipped during sequential evaluation and used
   * only when no named branch matches.
   */
  is_default?: boolean;
  /**
   * AND-list of conditions — ALL must be true for the branch to match.
   * An empty array is treated as "always true".
   */
  conditions: Condition[];
  /**
   * Inline actions to execute when this branch is chosen.
   * Each entry mirrors a full workflow step config.
   */
  steps: Array<{ type: string; config: Record<string, unknown> }>;
}

// ─── Evaluator ────────────────────────────────────────────────────────────────

/**
 * Evaluates a single condition against the contact record.
 * Returns true if the condition passes.
 */
function evaluateCondition(cond: Condition, contact: Record<string, unknown>): boolean {
  const raw = contact[cond.field];

  // Normalise to string and number for comparisons
  const strVal = raw == null ? '' : String(raw).toLowerCase().trim();
  const numVal = Number(raw);
  const compareStr = cond.value == null ? '' : String(cond.value).toLowerCase().trim();
  const compareNum = Number(cond.value ?? 0);

  switch (cond.operator) {
    case 'exists':
      return raw != null && strVal !== '';

    case 'not_exists':
      return raw == null || strVal === '';

    case 'equals':
      return strVal === compareStr;

    case 'not_equals':
      return strVal !== compareStr;

    case 'contains':
      return compareStr !== '' && strVal.includes(compareStr);

    case 'not_contains':
      return compareStr === '' || !strVal.includes(compareStr);

    case 'greater_than':
      return !isNaN(numVal) && !isNaN(compareNum) && numVal > compareNum;

    case 'less_than':
      return !isNaN(numVal) && !isNaN(compareNum) && numVal < compareNum;

    case 'is_between': {
      const [min, max] = compareStr.split(',').map(s => Number(s.trim()));
      return !isNaN(numVal) && !isNaN(min) && !isNaN(max) && numVal >= min && numVal <= max;
    }

    default:
      return false;
  }
}

/**
 * Evaluates an AND-list of conditions against the contact.
 * An empty conditions array is treated as "always true" (unconditional branch).
 */
export function evaluateConditionSet(
  conditions: Condition[],
  contact: Record<string, unknown>
): boolean {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, contact));
}

/**
 * Finds the first matching branch from an ordered list.
 * Default/fallback branches are excluded from sequential evaluation and
 * returned only if nothing else matches.
 *
 * @returns The winning Branch, or null if no branch (including default) matches.
 */
export function resolveWinningBranch(
  branches: Branch[],
  contact: Record<string, unknown>
): Branch | null {
  if (!branches || branches.length === 0) return null;

  let defaultBranch: Branch | null = null;

  for (const branch of branches) {
    if (branch.is_default) {
      // Store the first default we encounter; keep looking for a named match
      if (!defaultBranch) defaultBranch = branch;
      continue;
    }
    if (evaluateConditionSet(branch.conditions ?? [], contact)) {
      return branch; // First named match wins
    }
  }

  return defaultBranch; // Fallback
}
