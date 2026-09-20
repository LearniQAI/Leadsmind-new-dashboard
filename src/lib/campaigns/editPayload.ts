import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';

export interface EditInitial {
  body: string;
  tagNames: string[];
  ruleKey: string;
  segmentId: string | null;
  combine: string;
}

export interface EditFormState {
  name: string;
  subject: string;
  body: string;
  tagNames: string[];
  ruleGroup: RuleGroup | null;
  segmentId: string | null;
  combine: 'AND' | 'OR';
}

/**
 * Builds the updateCampaign payload for the Settings dialog, including ONLY
 * what the user actually changed. Previously every save blanket-wrote
 * body_html/preview_text (destroying the designed email) and rebuilt `segment`
 * (dropping the auto-sender flag and direct addresses).
 */
export function buildCampaignEditPayload(
  campaign: any,
  initial: EditInitial | null,
  form: EditFormState,
  tagIdForName: (name: string) => string | undefined,
): Record<string, any> {
  const payload: Record<string, any> = { name: form.name, subject: form.subject };

  // Body/preview: only when edited. The textarea is a plain-text preview, so a
  // campaign with a designed layout only ever gets preview_text written —
  // body_html (the designed email) is never replaced by plain text from here.
  const hasDesign = Array.isArray(campaign?.builder_json) && campaign.builder_json.length > 0;
  if (initial && form.body !== initial.body) {
    payload.preview_text = form.body;
    if (!hasDesign) payload.body_html = form.body;
  }

  const audienceChanged =
    !initial ||
    JSON.stringify([...form.tagNames].sort()) !== JSON.stringify([...initial.tagNames].sort()) ||
    JSON.stringify(form.ruleGroup) !== initial.ruleKey ||
    form.segmentId !== initial.segmentId ||
    form.combine !== initial.combine;

  if (audienceChanged) {
    const tagIds = form.tagNames.map(tagIdForName).filter((id): id is string => !!id);
    const hasRuleGroup = !!form.ruleGroup && form.ruleGroup.rules.length > 0;
    // A saved segment and the ad-hoc rule builder are mutually exclusive.
    const hasSegmentId = !!form.segmentId && !hasRuleGroup;
    const existing = campaign?.segment && typeof campaign.segment === 'object' ? campaign.segment : {};
    const preserved = {
      ...(Array.isArray(existing.emails) && existing.emails.length > 0 ? { emails: existing.emails } : {}),
      ...(existing.is_automated ? { is_automated: true } : {}),
    };
    const audience = {
      tags: tagIds.length > 0 ? tagIds : undefined,
      ruleGroup: hasRuleGroup ? form.ruleGroup : undefined,
      segmentId: hasSegmentId ? form.segmentId : undefined,
      combineMode: tagIds.length > 0 && (hasRuleGroup || hasSegmentId) ? form.combine : undefined,
    };
    const hasAny = tagIds.length > 0 || hasRuleGroup || hasSegmentId;
    payload.segment = hasAny || Object.keys(preserved).length > 0 ? { ...preserved, ...audience } : null;
  }
  return payload;
}
