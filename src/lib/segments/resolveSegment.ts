import { validateRuleGroup } from '@/lib/segments/ruleValidation';
import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';

/**
 * A campaign/auto-sender references a saved segment that can no longer be used
 * (deleted, or its rules are invalid). Callers MUST fail closed on this: silently
 * dropping the segment turns "tag AND segment" into "tag alone" and sends to a far
 * wider audience than the user configured.
 */
export class SegmentUnavailableError extends Error {
  // Authored for the user ("the saved segment was deleted"), so safe to show as-is.
  readonly userSafe = true as const;
  constructor(message: string) {
    super(message);
    this.name = 'SegmentUnavailableError';
  }
}

/**
 * Loads a saved segment's rule group, live (not a snapshot). Throws
 * SegmentUnavailableError when the segment does not exist in this workspace or holds
 * an invalid rule group. Any other failure (DB error) propagates — also fail-closed.
 */
export async function loadSegmentRuleGroup(supabase: any, workspaceId: string, segmentId: string): Promise<RuleGroup> {
  const { data, error } = await supabase
    .from('segments')
    .select('rule_group')
    .eq('id', segmentId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    throw new SegmentUnavailableError(
      'The saved segment selected for this audience no longer exists (it was deleted). Choose another segment or remove it before sending.',
    );
  }
  const problem = validateRuleGroup(data.rule_group);
  if (problem) {
    throw new SegmentUnavailableError(`The saved segment selected for this audience is invalid: ${problem} Fix the segment before sending.`);
  }
  return data.rule_group as RuleGroup;
}
