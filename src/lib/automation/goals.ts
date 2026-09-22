// Exit-on-conversion: the ONE goal implementation shared by Engine A (executor.ts, the
// workflow/sequence executor) and Engine B (WorkflowEngine.ts). A workflow's goal_rules is a
// JSON list of rules; the run ends early as soon as ANY rule is met for the contact.
//
//   { field: 'meeting_booked', operator: 'equals', value: true }   a real, kept appointment exists
//   { field: 'invoice_paid',   operator: 'equals', value: true }   a paid invoice exists
//   { field: 'tag', operator: 'equals'|'not_equals', value: '<tag name>', tag_id?: '<uuid>' }
//   { field: 'passed_quiz',    operator: 'equals', value: true }   (LMS seed rule)
//   { field: '<metadata key>', operator: 'equals'|'not_equals', value: any }   contact.metadata
//
// Tags are read from tag_assignments (the source of truth), NOT the legacy contacts.tags array,
// which is only a denormalised copy that can drift (same fix as the Segments "Has tag" rule).
import { logger } from '@/shared/logger';

export interface GoalRule {
  field: string;
  operator?: string;
  value?: unknown;
  tag_id?: string;
}

// Only appointments that were genuinely booked and kept count: a cancelled booking (or a
// no-show) is not a conversion.
export const CONVERTED_APPOINTMENT_STATUSES = ['scheduled', 'showed_up'];

const isTrue = (v: unknown) => v === true || v === 'true';
const norm = (s: unknown) => String(s ?? '').trim().toLowerCase();

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

/**
 * Whether the contact has the tag, per tag_assignments. Matches by tag id when the rule has
 * one (survives a rename), else by case-insensitive name. Returns null when it couldn't be
 * determined (query error) so callers can treat "unknown" as "not met" without pretending.
 */
export async function contactHasTag(
  supabase: any,
  workspaceId: string,
  contactId: string,
  match: { tagId?: string; names?: string[] },
): Promise<boolean | null> {
  let q = supabase
    .from('tag_assignments')
    .select('tag_id, tags!inner(name)')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', 'contact')
    .eq('entity_id', contactId);
  if (match.tagId) q = q.eq('tag_id', match.tagId);
  const { data, error } = await q;
  if (error) {
    logger.warn({ err: error, contactId }, 'goals.tag_lookup.failed');
    return null;
  }
  const rows: any[] = data ?? [];
  if (match.tagId) return rows.length > 0;
  const wanted = (match.names ?? []).map(norm);
  return rows.some((r) => {
    const t = Array.isArray(r.tags) ? r.tags[0] : r.tags;
    return wanted.includes(norm(t?.name));
  });
}

/** The first goal rule the contact currently satisfies, or null. */
export async function findMetGoal(
  goalRules: GoalRule[] | null | undefined,
  workspaceId: string,
  contactId: string | null,
  supabase: any,
): Promise<GoalRule | null> {
  if (!Array.isArray(goalRules) || goalRules.length === 0 || !contactId) return null;

  for (const rule of goalRules) {
    const { field, operator, value } = rule ?? ({} as GoalRule);
    if (!field) continue;

    if (field === 'invoice_paid') {
      if (!isTrue(value)) continue;
      const { data, error } = await supabase
        .from('invoices').select('id')
        .eq('workspace_id', workspaceId).eq('contact_id', contactId).eq('status', 'paid').limit(1);
      if (!error && data && data.length > 0) return rule;
      continue;
    }

    if (field === 'meeting_booked') {
      if (!isTrue(value)) continue;
      const { data, error } = await supabase
        .from('appointments').select('id')
        .eq('workspace_id', workspaceId).eq('contact_id', contactId)
        .in('status', CONVERTED_APPOINTMENT_STATUSES).limit(1);
      if (!error && data && data.length > 0) return rule;
      continue;
    }

    if (field === 'passed_quiz') {
      if (!isTrue(value)) continue;
      const hasTag = await contactHasTag(supabase, workspaceId, contactId, { names: ['Passed Quiz', 'passed_quiz'] });
      if (hasTag) return rule;
      const { data: contact } = await supabase
        .from('contacts').select('metadata').eq('id', contactId).eq('workspace_id', workspaceId).maybeSingle();
      if (isTrue(contact?.metadata?.passed_quiz)) return rule;
      continue;
    }

    if (field === 'tag' || field === 'tags') {
      const has = await contactHasTag(supabase, workspaceId, contactId, { tagId: rule.tag_id, names: [String(value ?? '')] });
      if (has === null) continue; // couldn't tell: not a conversion
      if ((operator ?? 'equals') === 'equals' && has) return rule;
      if (operator === 'not_equals' && !has) return rule;
      continue;
    }

    // Any other field: a key on contacts.metadata.
    const { data: contact } = await supabase
      .from('contacts').select('metadata').eq('id', contactId).eq('workspace_id', workspaceId).maybeSingle();
    const metaVal = (contact?.metadata ?? {})[field];
    if ((operator ?? 'equals') === 'equals' && String(metaVal) === String(value)) return rule;
    if (operator === 'not_equals' && String(metaVal) !== String(value)) return rule;
  }
  return null;
}

export async function evaluateGoal(
  goalRules: GoalRule[] | null | undefined,
  workspaceId: string,
  contactId: string | null,
  supabase: any,
): Promise<boolean> {
  return (await findMetGoal(goalRules, workspaceId, contactId, supabase)) !== null;
}
