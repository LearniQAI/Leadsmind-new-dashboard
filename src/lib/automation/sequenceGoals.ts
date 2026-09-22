// Plain (non-"use server") module: the sequence editor's "Stop when the contact converts" goals
// <-> the workflow's goal_rules JSON (evaluated by src/lib/automation/goals.ts). Shared by the
// server action and the client editor.
import { GOAL_FIELDS, type GoalRule } from './goals';

export type SequenceGoalKind = 'appointment' | 'invoice' | 'tag';

// What the editor sends: a kind, plus the tag id for 'tag'. (The server turns it into a rule,
// looking up the tag's current name so it is stored alongside the id.)
export interface SequenceGoal {
  kind: SequenceGoalKind;
  tagId?: string;
}

export const MAX_SEQUENCE_GOALS = 10;

export const GOAL_KIND_LABELS: Record<SequenceGoalKind, string> = {
  appointment: 'Books an appointment',
  invoice: 'Pays an invoice',
  tag: 'Gets a tag',
};

// Rules this editor can represent. Anything else (e.g. the LMS seed's passed_quiz rule, or a
// metadata rule set elsewhere) is left exactly as it is when a sequence is saved.
export function isEditorRule(rule: GoalRule): boolean {
  if (!rule) return false;
  if (rule.field === GOAL_FIELDS.appointment || rule.field === GOAL_FIELDS.invoice) return rule.operator === 'equals' && rule.value === true;
  if (rule.field === GOAL_FIELDS.tag) return (rule.operator ?? 'equals') === 'equals';
  return false;
}

export function rulesToGoals(rules: GoalRule[] | null | undefined): SequenceGoal[] {
  return (Array.isArray(rules) ? rules : []).filter(isEditorRule).map((r): SequenceGoal => {
    if (r.field === GOAL_FIELDS.appointment) return { kind: 'appointment' };
    if (r.field === GOAL_FIELDS.invoice) return { kind: 'invoice' };
    return { kind: 'tag', tagId: r.tag_id };
  });
}

/**
 * The rules to store: the editor's goals (deduplicated) followed by any existing rules the
 * editor can't represent, preserved untouched. `tagNames` maps tag id -> current name.
 */
export function goalsToRules(goals: SequenceGoal[], tagNames: Map<string, string>, existing: GoalRule[] = []): GoalRule[] {
  const rules: GoalRule[] = [];
  const seen = new Set<string>();
  for (const g of goals) {
    const key = g.kind === 'tag' ? `tag:${g.tagId}` : g.kind;
    if (seen.has(key)) continue;
    seen.add(key);
    if (g.kind === 'appointment') rules.push({ field: GOAL_FIELDS.appointment, operator: 'equals', value: true });
    else if (g.kind === 'invoice') rules.push({ field: GOAL_FIELDS.invoice, operator: 'equals', value: true });
    else if (g.kind === 'tag' && g.tagId && tagNames.has(g.tagId)) {
      rules.push({ field: GOAL_FIELDS.tag, operator: 'equals', value: tagNames.get(g.tagId), tag_id: g.tagId });
    }
  }
  return [...rules, ...(Array.isArray(existing) ? existing : []).filter((r) => !isEditorRule(r))];
}
