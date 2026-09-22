// Client-safe pieces of the goal-rule schema: types, constants, and pure helpers with no
// server-only dependency (no logger, no supabase). Safe to import from 'use client' components
// (e.g. SequenceEditorClient.tsx) as well as server code. The actual evaluation logic
// (findMetGoal/evaluateGoal/contactHasTag), which needs the server-only logger, lives in
// ./goals and must never be imported from client components.
export interface GoalRule {
  field: string;
  operator?: string;
  value?: unknown;
  tag_id?: string;
}

// Only appointments that were genuinely booked and kept count: a cancelled booking (or a
// no-show) is not a conversion.
export const CONVERTED_APPOINTMENT_STATUSES = ['scheduled', 'showed_up'];

/** Editor-facing rule fields (what the sequence editor can create). */
export const GOAL_FIELDS = { appointment: 'meeting_booked', invoice: 'invoice_paid', tag: 'tag' } as const;

export function describeGoal(rule: GoalRule): string {
  switch (rule.field) {
    case 'meeting_booked': return 'an appointment was booked';
    case 'invoice_paid': return 'an invoice was paid';
    case 'passed_quiz': return 'the quiz was passed';
    case 'tag': case 'tags':
      return `${rule.operator === 'not_equals' ? 'tag removed' : 'tag added'}: ${String(rule.value ?? '')}`;
    default: return `${rule.field} ${rule.operator ?? 'equals'} ${String(rule.value ?? '')}`;
  }
}
