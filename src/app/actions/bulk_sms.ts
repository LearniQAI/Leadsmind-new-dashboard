'use server';

// Bulk SMS marketing — one-time scheduled bulk send. Audience resolution and
// the dispatch-queue shape deliberately mirror email_campaigns / campaign_dispatch_queue
// in marketing.ts (SegmentationCompiler.executeSegment() for saved Segments /
// ad-hoc rule groups, tag_assignments for tags), swapping sendEmail for
// sendSMS and gating on contacts.sms_opt_out (email's equivalent is
// contacts.is_invalid_email, popia.ts). Not built on the Email Sequences
// wait/resume engine — that's for multi-step drips, this is a single
// scheduled broadcast.

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { SegmentationCompiler, RuleGroup } from '@/lib/intelligence/SegmentationCompiler';

export interface CreateBulkSmsPayload {
  name: string;
  messageBody: string;
  segmentId?: string | null;
  ruleGroup?: RuleGroup | null;
  tags?: string[];
  scheduledAt?: string | null; // null/undefined = send as soon as the cron worker next runs
}

export async function listBulkSmsCampaigns() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('bulk_sms_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return { success: true as const, data: data ?? [] };
  } catch (error: any) {
    logger.error({ err: error }, 'list.bulk_sms_campaigns.failed');
    return { success: false as const, error: 'Failed to load SMS campaigns' };
  }
}

// Resolves an audience the exact same way marketing.ts's updateCampaign()
// does for email — saved Segment (live rule_group, not a snapshot), ad-hoc
// RuleGroup, and/or tags, combined with AND. Excludes contacts with no phone
// number and contacts who have opted out of SMS (contacts.sms_opt_out).
async function resolveAudience(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  workspaceId: string,
  payload: Pick<CreateBulkSmsPayload, 'segmentId' | 'ruleGroup' | 'tags'>
): Promise<{ contactIds: string[]; excludedOptOut: number }> {
  let ruleGroup: RuleGroup | null =
    payload.ruleGroup && Array.isArray(payload.ruleGroup.rules) && payload.ruleGroup.rules.length > 0
      ? payload.ruleGroup
      : null;

  if (!ruleGroup && payload.segmentId) {
    const { data: savedSegment } = await supabase
      .from('segments')
      .select('rule_group')
      .eq('id', payload.segmentId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (savedSegment?.rule_group && Array.isArray(savedSegment.rule_group.rules) && savedSegment.rule_group.rules.length > 0) {
      ruleGroup = savedSegment.rule_group;
    }
  }

  const tags = (payload.tags ?? []).filter(Boolean);

  let ruleMatchedIds: Set<string> | null = null;
  if (ruleGroup) {
    const matches = await SegmentationCompiler.executeSegment(workspaceId, ruleGroup);
    ruleMatchedIds = new Set(matches.map((c: any) => c.id));
  }

  let tagMatchedIds: Set<string> | null = null;
  if (tags.length > 0) {
    const { data: legacyMatches, error: tagErr } = await supabase
      .from('contacts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .contains('tags', tags);
    if (tagErr) throw tagErr;
    tagMatchedIds = new Set((legacyMatches ?? []).map((c: any) => c.id));
  }

  let matchedIds: Set<string>;
  if (ruleMatchedIds && tagMatchedIds) {
    matchedIds = new Set([...ruleMatchedIds].filter((id) => tagMatchedIds!.has(id)));
  } else {
    matchedIds = ruleMatchedIds || tagMatchedIds || new Set<string>();
  }

  if (matchedIds.size === 0) return { contactIds: [], excludedOptOut: 0 };

  const { data: eligible, error: eligErr } = await supabase
    .from('contacts')
    .select('id, phone, sms_opt_out')
    .in('id', Array.from(matchedIds));
  if (eligErr) throw eligErr;

  const withPhone = (eligible ?? []).filter((c: any) => !!c.phone);
  const excludedOptOut = withPhone.filter((c: any) => c.sms_opt_out).length;
  const contactIds = withPhone.filter((c: any) => !c.sms_opt_out).map((c: any) => c.id);

  return { contactIds, excludedOptOut };
}

// Creates the campaign and, in the same call, resolves the audience and
// enqueues sms_dispatch_queue rows with scheduled_for = scheduledAt (or now
// if left blank) — same "queue rows written at deploy time, not promoted
// later by a second cron" pattern email campaigns use. This is what gives a
// future scheduledAt real effect: the sms-dispatch worker's acquire_sms_jobs
// RPC only picks up rows whose scheduled_for has passed.
export async function createBulkSmsCampaign(payload: CreateBulkSmsPayload) {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    if (!payload.name?.trim()) return { success: false as const, error: 'Campaign name is required' };
    if (!payload.messageBody?.trim()) return { success: false as const, error: 'Message body is required' };
    if (!payload.segmentId && !payload.ruleGroup && !(payload.tags && payload.tags.length > 0)) {
      return { success: false as const, error: 'Select an audience (segment, rule, or tags)' };
    }

    const supabase = await createServerClient();

    const { contactIds, excludedOptOut } = await resolveAudience(supabase, workspaceId, payload);
    if (contactIds.length === 0) {
      return { success: false as const, error: 'No eligible recipients matched this audience (check opt-outs and missing phone numbers)' };
    }

    const scheduledFor = payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : new Date().toISOString();

    const { data: campaign, error: insertErr } = await supabase
      .from('bulk_sms_campaigns')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        message_body: payload.messageBody.trim(),
        segment_id: payload.segmentId || null,
        rule_group: payload.ruleGroup || null,
        tags: payload.tags || null,
        scheduled_at: scheduledFor,
        status: 'scheduled',
        total_recipients: contactIds.length,
        total_skipped_opt_out: excludedOptOut,
        created_by: userId,
      })
      .select()
      .single();
    if (insertErr || !campaign) throw insertErr || new Error('Failed to create campaign');

    const queueRows = contactIds.map((contactId) => ({
      campaign_id: campaign.id,
      workspace_id: workspaceId,
      contact_id: contactId,
      status: 'pending',
      scheduled_for: scheduledFor,
    }));

    // Admin client for the queue insert — sms_dispatch_queue has no
    // user-facing RLS policy (same as campaign_dispatch_queue), it's only
    // ever written by server actions / the cron worker.
    const admin = createAdminClient();
    const { error: queueErr } = await admin
      .from('sms_dispatch_queue')
      .upsert(queueRows, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true });
    if (queueErr) {
      logger.error({ err: queueErr, campaignId: campaign.id }, 'create.bulk_sms_campaign.queue_insert.failed');
      throw new Error('Failed to queue campaign recipients');
    }

    revalidatePath('/sms');
    return { success: true as const, data: campaign, recipientCount: contactIds.length, excludedOptOut };
  } catch (error: any) {
    logger.error({ err: error }, 'create.bulk_sms_campaign.failed');
    return { success: false as const, error: error.message || 'Failed to create SMS campaign' };
  }
}

export async function cancelBulkSmsCampaign(id: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: campaign, error: fetchErr } = await supabase
      .from('bulk_sms_campaigns')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();
    if (fetchErr || !campaign) return { success: false as const, error: 'Campaign not found' };
    if (!['scheduled', 'sending'].includes(campaign.status)) {
      return { success: false as const, error: 'Only scheduled or in-progress campaigns can be cancelled' };
    }

    const admin = createAdminClient();
    await admin
      .from('sms_dispatch_queue')
      .update({ status: 'failed', error_log: 'Cancelled by user' })
      .eq('campaign_id', id)
      .eq('status', 'pending');

    const { error: updateErr } = await supabase
      .from('bulk_sms_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (updateErr) throw updateErr;

    revalidatePath('/sms');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'cancel.bulk_sms_campaign.failed');
    return { success: false as const, error: 'Failed to cancel campaign' };
  }
}

export async function deleteBulkSmsCampaign(id: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: campaign } = await supabase
      .from('bulk_sms_campaigns')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();
    if (campaign && campaign.status === 'sending') {
      return { success: false as const, error: 'Cannot delete a campaign that is currently sending' };
    }

    const { error } = await supabase
      .from('bulk_sms_campaigns')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw error;

    revalidatePath('/sms');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.bulk_sms_campaign.failed');
    return { success: false as const, error: 'Failed to delete campaign' };
  }
}
