import { createAdminClient } from '@/lib/supabase/server';
import { SegmentationCompiler, type RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { inngest } from '@/lib/inngest';
import { logger } from '@/shared/logger';
import { filterEmailableContactIds } from '@/lib/campaigns/emailSuppression';
import { validateRuleGroup, InvalidRuleGroupError } from '@/lib/segments/ruleValidation';
import { loadSegmentRuleGroup, SegmentUnavailableError } from '@/lib/segments/resolveSegment';

type Campaign = { id: string; segment: any };

/**
 * Enrols one CRM contact in every matching live auto-sender campaign.
 * campaign_dispatch_queue's unique (campaign_id, contact_id) constraint is
 * the final idempotency gate: a later tag event can never cause a second send.
 */
export async function enqueueAutoSenderCampaigns(workspaceId: string, contactId: string) {
  const supabase = createAdminClient();
  const [{ data: contact, error: contactError }, { data: campaigns, error: campaignsError }] = await Promise.all([
    supabase.from('contacts').select('id, tags').eq('id', contactId).eq('workspace_id', workspaceId).maybeSingle(),
    supabase
      .from('email_campaigns')
      .select('id, segment')
      .eq('workspace_id', workspaceId)
      .in('status', ['scheduled', 'sent'])
      .contains('segment', { is_automated: true }),
  ]);
  if (contactError) throw contactError;
  if (campaignsError) throw campaignsError;
  if (!contact || !campaigns?.length) return { enrolled: 0, matched: 0 };

  const { data: assignments, error: assignmentError } = await supabase
    .from('tag_assignments')
    .select('tag_id')
    .eq('workspace_id', workspaceId)
    .eq('entity_type', 'contact')
    .eq('entity_id', contactId);
  if (assignmentError) throw assignmentError;
  const contactTagIds = new Set((assignments ?? []).map((row) => row.tag_id));
  const contactTagNames = new Set(Array.isArray(contact.tags) ? contact.tags : []);
  const { data: workspaceTags, error: workspaceTagsError } = await supabase
    .from('tags')
    .select('id, name')
    .eq('workspace_id', workspaceId);
  if (workspaceTagsError) throw workspaceTagsError;
  const tagNameById = new Map((workspaceTags ?? []).map((tag) => [tag.id, tag.name]));

  const matchingIds: string[] = [];
  for (const campaign of campaigns as Campaign[]) {
    const segment = campaign.segment ?? {};
    const campaignTags: string[] = Array.isArray(segment.tags) ? segment.tags : [];
    const tagMatches = campaignTags.length === 0 || campaignTags.every((tag) =>
      contactTagIds.has(tag) || contactTagNames.has(tag) || contactTagNames.has(tagNameById.get(tag) ?? ''),
    );

    // Resolve this campaign's rule group. A campaign whose saved segment was deleted (or whose
    // rules are invalid) FAILS CLOSED: it is skipped and an error is logged, never evaluated on
    // its tags alone — that silently turned "tag AND segment" into "tag" and emailed a far
    // wider audience than configured.
    let rules: RuleGroup | null = segment.ruleGroup?.rules?.length ? segment.ruleGroup : null;
    if (rules) {
      const problem = validateRuleGroup(rules);
      if (problem) {
        logger.error({ campaignId: campaign.id, workspaceId, problem }, 'campaign.auto_sender.rules_invalid');
        continue;
      }
    } else if (segment.segmentId) {
      try {
        rules = await loadSegmentRuleGroup(supabase, workspaceId, segment.segmentId);
      } catch (segErr) {
        if (segErr instanceof SegmentUnavailableError) {
          logger.error({ campaignId: campaign.id, workspaceId, segmentId: segment.segmentId, reason: segErr.message }, 'campaign.auto_sender.segment_unavailable');
          continue;
        }
        throw segErr;
      }
    }

    let ruleMatches = true;
    if (rules?.rules?.length) {
      try {
        const contacts = await SegmentationCompiler.executeSegment(workspaceId, rules);
        ruleMatches = contacts.some((matched: any) => matched.id === contactId);
      } catch (evalErr) {
        if (evalErr instanceof InvalidRuleGroupError) {
          logger.error({ campaignId: campaign.id, workspaceId, problem: evalErr.message }, 'campaign.auto_sender.rules_invalid');
          continue;
        }
        throw evalErr;
      }
    }

    const hasTags = campaignTags.length > 0;
    const hasRules = !!rules?.rules?.length;
    if (!hasTags && !hasRules) continue;
    const matches = hasTags && hasRules
      ? segment.combineMode === 'OR' ? tagMatches || ruleMatches : tagMatches && ruleMatches
      : tagMatches && ruleMatches;
    if (matches) matchingIds.push(campaign.id);
  }

  if (!matchingIds.length) return { enrolled: 0, matched: 0 };

  // Same enqueue-time gate as updateCampaign: never enrol an unsubscribed/invalid contact.
  const { eligible } = await filterEmailableContactIds(supabase, workspaceId, [contactId]);
  if (eligible.length === 0) return { enrolled: 0, matched: matchingIds.length };
  const { data: inserted, error: queueError } = await supabase
    .from('campaign_dispatch_queue')
    .upsert(
      matchingIds.map((campaignId) => ({
        campaign_id: campaignId,
        workspace_id: workspaceId,
        contact_id: contactId,
        status: 'pending',
        scheduled_for: new Date().toISOString(),
      })),
      { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true },
    )
    .select('campaign_id');
  if (queueError) throw queueError;

  const enrolledCampaignIds = [...new Set((inserted ?? []).map((row) => row.campaign_id))];
  await Promise.all(enrolledCampaignIds.map((campaignId) =>
    inngest.send({ name: 'campaign/dispatch', data: { campaignId } }),
  ));
  logger.info({ workspaceId, contactId, matched: matchingIds.length, enrolled: enrolledCampaignIds.length }, 'campaign.auto_sender.enrollment.complete');
  return { enrolled: enrolledCampaignIds.length, matched: matchingIds.length };
}
