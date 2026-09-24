'use server';

// Bulk SMS marketing — one-time scheduled bulk send. Audience resolution and
// the dispatch-queue shape follow email_campaigns / campaign_dispatch_queue
// in marketing.ts: SegmentationCompiler.executeSegment() for saved Segments /
// ad-hoc rule groups, and tags resolved from tag_assignments (src/lib/tagAudience.ts:
// a contact must carry ALL listed tags). The legacy contacts.tags array is NOT read.
// Opt-out is the contact's sms_opt_out/opted_out flags plus the durable
// sms_suppression_list (src/lib/smsOptOut.ts), enforced again at send time.
// Not built on the Email Sequences wait/resume engine — that's for multi-step
// drips, this is a single scheduled broadcast.

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess, requireModuleAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { SegmentationCompiler, RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { validateRuleGroup } from '@/lib/segments/ruleValidation';
import { loadSegmentRuleGroup } from '@/lib/segments/resolveSegment';
import { userSafeMessage } from '@/shared/errors/userSafe';
import { ValidationError } from '@/shared/errors/AppError';
import { getSmsReadiness, SMS_NOT_CONFIGURED_MESSAGE } from '@/lib/smsReadiness';
import { MAX_SMS_BODY_CHARS } from '@/lib/smsSegments';
import { resolveContactIdsWithAllTags } from '@/lib/tagAudience';

// PostgREST puts `.in('id', [...])` in the URL, and a URL longer than ~12-16k characters is rejected
// (measured live: 300 uuids works, 400+ fails). Every id-list lookup is therefore done in chunks.
const ID_CHUNK = 100;
const QUEUE_INSERT_CHUNK = 500;

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
): Promise<{ contactIds: string[]; excludedOptOut: number; excludedInvalid: number }> {
  let ruleGroup: RuleGroup | null =
    payload.ruleGroup && Array.isArray(payload.ruleGroup.rules) && payload.ruleGroup.rules.length > 0
      ? payload.ruleGroup
      : null;

  // Validate ad-hoc rules, and resolve a saved segment FAIL-CLOSED: a deleted/invalid segment must
  // error clearly (and before any row is written), never be dropped and evaluated on tags alone.
  if (ruleGroup) {
    const problem = validateRuleGroup(ruleGroup);
    if (problem) throw new ValidationError(problem); // authored for the user, so safe to show
  }
  if (!ruleGroup && payload.segmentId) {
    ruleGroup = await loadSegmentRuleGroup(supabase, workspaceId, payload.segmentId);
  }

  const tags = (payload.tags ?? []).filter(Boolean);

  let ruleMatchedIds: Set<string> | null = null;
  if (ruleGroup) {
    const matches = await SegmentationCompiler.executeSegment(workspaceId, ruleGroup);
    ruleMatchedIds = new Set(matches.map((c: any) => c.id));
  }

  // Tags are matched against tag_assignments (the source of truth), NOT the legacy contacts.tags array
  // this used to read; a contact must carry ALL the listed tags (by name or id).
  let tagMatchedIds: Set<string> | null = null;
  if (tags.length > 0) {
    tagMatchedIds = await resolveContactIdsWithAllTags(supabase, workspaceId, tags);
  }

  let matchedIds: Set<string>;
  if (ruleMatchedIds && tagMatchedIds) {
    matchedIds = new Set([...ruleMatchedIds].filter((id) => tagMatchedIds!.has(id)));
  } else {
    matchedIds = ruleMatchedIds || tagMatchedIds || new Set<string>();
  }

  if (matchedIds.size === 0) return { contactIds: [], excludedOptOut: 0, excludedInvalid: 0 };

  // Chunked: one request carrying every matched id put them all in the URL and failed outright for
  // audiences above ~300-400 contacts.
  const matchedList = Array.from(matchedIds);
  const eligible: any[] = [];
  for (let i = 0; i < matchedList.length; i += ID_CHUNK) {
    const { data, error: eligErr } = await supabase
      .from('contacts')
      .select('id, phone, phone_e164, sms_opt_out, opted_out, sms_invalid')
      .in('id', matchedList.slice(i, i + ID_CHUNK));
    if (eligErr) throw eligErr;
    eligible.push(...(data ?? []));
  }

  // Opt-outs and invalid-number flags also live in the durable suppression list (workspace + E.164
  // phone), which outlives contact deletion/re-import; honour it alongside the contact-row flags.
  // reasonByPhone distinguishes the two so a dead number isn't miscounted as an opt-out or vice versa.
  const reasonByPhone = new Map<string, string>();
  const phones = [...new Set((eligible ?? []).map((c: any) => c.phone_e164).filter(Boolean))] as string[];
  for (let i = 0; i < phones.length; i += 100) {
    const { data: listed, error: listErr } = await supabase
      .from('sms_suppression_list').select('phone_e164, reason')
      .eq('workspace_id', workspaceId).in('phone_e164', phones.slice(i, i + 100));
    if (listErr) throw listErr;
    for (const r of listed ?? []) reasonByPhone.set(r.phone_e164, r.reason);
  }

  // A number that cannot be normalised to E.164 can never be texted (or matched to a STOP/invalid
  // record): skip it (counted as an opt-out exclusion, matching its prior behaviour, since it was
  // never distinguished from "unreachable" before this change either).
  const withPhone = (eligible ?? []).filter((c: any) => !!c.phone && !!c.phone_e164);
  const isInvalid = (c: any) => c.sms_invalid || reasonByPhone.get(c.phone_e164) === 'invalid_number';
  const isOptedOut = (c: any) => !isInvalid(c) && (c.sms_opt_out || c.opted_out || reasonByPhone.has(c.phone_e164));
  const excludedInvalid = withPhone.filter(isInvalid).length;
  const excludedOptOut = withPhone.filter(isOptedOut).length;
  const contactIds = withPhone.filter((c: any) => !isInvalid(c) && !isOptedOut(c)).map((c: any) => c.id);

  return { contactIds, excludedOptOut, excludedInvalid };
}

// Creates the campaign and, in the same call, resolves the audience and
// enqueues sms_dispatch_queue rows with scheduled_for = scheduledAt (or now
// if left blank) — same "queue rows written at deploy time, not promoted
// later by a second cron" pattern email campaigns use. This is what gives a
// future scheduledAt real effect: the sms-dispatch worker's acquire_sms_jobs
// RPC only picks up rows whose scheduled_for has passed.
export async function createBulkSmsCampaign(payload: CreateBulkSmsPayload) {
  await requireModuleAccess('marketing');
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    if (!payload.name?.trim()) return { success: false as const, error: 'Campaign name is required' };
    if (!payload.messageBody?.trim()) return { success: false as const, error: 'Message body is required' };
    if (payload.messageBody.trim().length > MAX_SMS_BODY_CHARS) {
      return { success: false as const, error: `Message is too long (maximum ${MAX_SMS_BODY_CHARS} characters).` };
    }
    if (!payload.segmentId && !payload.ruleGroup && !(payload.tags && payload.tags.length > 0)) {
      return { success: false as const, error: 'Select an audience (segment, rule, or tags)' };
    }

    // Pre-flight: refuse upfront when the workspace cannot send SMS at all, rather than accepting a
    // campaign whose every row then fails (and is retried for over an hour) at dispatch time.
    const readiness = await getSmsReadiness(workspaceId);
    if (!readiness.ready) return { success: false as const, error: SMS_NOT_CONFIGURED_MESSAGE };

    const supabase = await createServerClient();

    const { contactIds, excludedOptOut, excludedInvalid } = await resolveAudience(supabase, workspaceId, payload);
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
        total_skipped_invalid_number: excludedInvalid,
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
    for (let i = 0; i < queueRows.length; i += QUEUE_INSERT_CHUNK) {
      const { error: queueErr } = await admin
        .from('sms_dispatch_queue')
        .upsert(queueRows.slice(i, i + QUEUE_INSERT_CHUNK), { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true });
      if (queueErr) {
        logger.error({ err: queueErr, campaignId: campaign.id }, 'create.bulk_sms_campaign.queue_insert.failed');
        // Do not leave a "scheduled" campaign with only part of its audience queued.
        await admin.from('sms_dispatch_queue').delete().eq('campaign_id', campaign.id);
        await admin.from('bulk_sms_campaigns').delete().eq('id', campaign.id);
        throw new Error('Failed to queue campaign recipients');
      }
    }

    revalidatePath('/sms');
    return { success: true as const, data: campaign, recipientCount: contactIds.length, excludedOptOut, excludedInvalid };
  } catch (error: any) {
    logger.error({ err: error }, 'create.bulk_sms_campaign.failed');
    // Only errors authored for the user (validation, "segment was deleted", ...) reach the client;
    // driver/DB/network errors are logged above and replaced by a generic message.
    return { success: false as const, error: userSafeMessage(error, 'Failed to create SMS campaign') };
  }
}

export async function cancelBulkSmsCampaign(id: string) {
  await requireModuleAccess('marketing');
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

    // Campaign FIRST: the dispatch worker re-reads this status before every send, so rows it has
    // already claimed ('processing') but not yet sent stop too. Only a message already handed to Twilio
    // cannot be recalled. Then close out the queued rows as 'cancelled' (not 'failed': a cancel is not a
    // send failure and must not count as one).
    const { error: updateErr } = await supabase
      .from('bulk_sms_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (updateErr) throw updateErr;

    const admin = createAdminClient();
    await admin
      .from('sms_dispatch_queue')
      .update({ status: 'cancelled', error_log: 'Cancelled by user', locked_by: null })
      .eq('campaign_id', id)
      .in('status', ['pending', 'processing', 'deferred']);

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
