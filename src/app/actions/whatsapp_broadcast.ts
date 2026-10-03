'use server';

// WhatsApp Broadcast Lists — Task 43. Audience resolution and the
// dispatch-queue shape mirror bulk_sms.ts (which follows email_campaigns/
// campaign_dispatch_queue): SegmentationCompiler for segments/rules, tags resolved from
// tag_assignments via src/lib/tagAudience.ts (ALL listed tags; the legacy contacts.tags
// array is NOT read), same admin-client queue insert pattern.
// Two differences from Bulk SMS: (1) consent gates on contacts.opted_out,
// the WhatsApp-specific field already maintained by
// processInboundComplianceAndWindow() in webhooks/meta/route.ts — NOT
// sms_opt_out, which is Twilio SMS's own field; (2) a campaign can carry a
// free-text body AND/OR an approved template — the cron worker picks per
// contact based on their 24h session-window status at send time (see
// whatsapp-dispatch/route.ts).

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess, requireModuleAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { decrypt } from '@/lib/encryption';
import type { RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { userSafeMessage } from '@/shared/errors/userSafe';
import { readWhatsAppCredentials } from '@/lib/meta/whatsappCredentials';
import { resolveScheduledFor } from '@/lib/whatsapp/schedule';
import { isMetaMockMode, isMockValue, MOCK_CREDENTIALS_REJECTED } from '@/lib/meta/mockMode';
import {
  resolveBroadcastAudience, audienceFromLegacy, audienceFromInput, topExclusionReason,
} from '@/lib/whatsapp/audience/resolveBroadcastAudience';
import { COMPLIANCE_TEXT_VERSION, type BroadcastAudienceInput } from '@/lib/whatsapp/audience/types';
import { countWindowStatus } from '@/lib/whatsapp/audience/windowCounts';

const QUEUE_INSERT_CHUNK = 500;

export interface CreateWhatsAppBroadcastPayload {
  name: string;
  messageBody?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateBodyParams?: string[] | null;
  // New (B1a): one audience object. The legacy segmentId / ruleGroup / tags inputs below still work.
  audience?: BroadcastAudienceInput;
  /** Required true for every audience type: the sender confirms the contacts agreed to WhatsApp marketing. */
  consentAttested?: boolean;
  segmentId?: string | null;
  ruleGroup?: RuleGroup | null;
  tags?: string[];
  scheduledAt?: string | null;
}

export async function listWhatsAppBroadcastCampaigns() {
  try {
    await requireModuleAccess('marketing');
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data, error } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    return { success: true as const, data: data ?? [] };
  } catch (error: any) {
    logger.error({ err: error }, 'list.whatsapp_broadcast_campaigns.failed');
    return { success: false as const, error: 'Failed to load WhatsApp campaigns' };
  }
}

// Live Graph API fetch of this workspace's connected WABA's approved
// templates (GET /{waba_id}/message_templates) — templates aren't self-serve,
// they're submitted and reviewed by Meta outside this app, so the picker
// shows only what's actually usable rather than trusting a free-typed name.
// Falls back to a small mock set when the connection is a mock/placeholder
// (same "mock_" convention validateMetaPlatformCredentials uses), so the
// campaign UI stays usable in dev without live WABA credentials.
export async function listApprovedWhatsAppTemplates() {
  try {
    await requireModuleAccess('marketing');
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: conn } = await supabase
      .from('platform_connections')
      .select('credentials')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'whatsapp')
      .maybeSingle();

    if (!conn?.credentials) {
      return { success: false as const, error: 'Connect a WhatsApp Business account first (Settings > Integrations)' };
    }

    const { wabaId } = readWhatsAppCredentials(conn.credentials);
    const encryptedToken = conn.credentials.system_user_access_token_encrypted || conn.credentials.access_token_encrypted || '';

    if (isMockValue(wabaId) || !encryptedToken) {
      // Sample templates only in explicit mock mode (never production); otherwise say what is wrong.
      if (!isMetaMockMode()) {
        return {
          success: false as const,
          error: isMockValue(wabaId) ? MOCK_CREDENTIALS_REJECTED : 'WhatsApp is not fully connected. Reconnect it in Settings > Integrations.',
        };
      }
      return {
        success: true as const,
        data: [
          { name: 'order_confirmation', language: 'en_US', category: 'UTILITY', status: 'APPROVED', bodyText: 'Hi {{1}}, your order #{{2}} has been confirmed.' },
          { name: 'appointment_reminder', language: 'en_US', category: 'UTILITY', status: 'APPROVED', bodyText: 'Hi {{1}}, reminder for your appointment on {{2}}.' },
        ],
        mock: true,
      };
    }

    const token = decrypt(encryptedToken);
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${wabaId}/message_templates?fields=name,status,language,category,components&limit=100&access_token=${token}`
    );
    const resData = await res.json();
    if (!res.ok) throw new Error(resData.error?.message || 'Failed to fetch WhatsApp templates');

    const approved = (resData.data || [])
      .filter((t: any) => t.status === 'APPROVED')
      .map((t: any) => {
        const bodyComponent = (t.components || []).find((c: any) => c.type === 'BODY');
        return { name: t.name, language: t.language, category: t.category, status: t.status, bodyText: bodyComponent?.text || '' };
      });

    return { success: true as const, data: approved, mock: false };
  } catch (error: any) {
    logger.error({ err: error }, 'list.whatsapp_templates.failed');
    return { success: false as const, error: userSafeMessage(error, 'Failed to fetch WhatsApp templates') };
  }
}

export const WHATSAPP_ATTESTATION_REQUIRED_MESSAGE =
  'Confirm that these contacts agreed to receive WhatsApp marketing messages before creating a campaign.';

export type WhatsAppPreviewResult =
  | {
      success: true;
      counts: { matched: number; eligible: number };
      exclusions: { no_phone: number; invalid_number: number; opted_out: number; suppressed: number; duplicate_phone: number };
      sample: { name: string; phone: string }[];
      /** Eligible recipients with / without an open 24-hour window right now (read-only; same clock as the worker). */
      window: { open: number; closed: number };
    }
  | { success: false; error: string };

// Read-only dry run of the audience a campaign form describes. Returns counts, the exclusion breakdown and up to 5
// masked samples (first name + last 3 digits). Never returns a raw phone number or a full name, and writes nothing.
export async function previewWhatsAppBroadcastAudience(audience: BroadcastAudienceInput): Promise<WhatsAppPreviewResult> {
  await requireModuleAccess('marketing');
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const resolved = await resolveBroadcastAudience(supabase, workspaceId, audienceFromInput(audience));
    const window = await countWindowStatus(supabase, workspaceId, resolved.contactIds);
    return { success: true, counts: resolved.counts, exclusions: resolved.exclusions, sample: resolved.sample, window };
  } catch (error: any) {
    logger.error({ err: error }, 'preview.whatsapp_broadcast_audience.failed');
    return { success: false, error: userSafeMessage(error, 'Failed to preview this audience') };
  }
}

// id + name only, for the optional "Saved segment" audience. Read-only; called lazily by the UI so the page does not
// compute live member counts for every segment just to render a dropdown.
export async function listAudienceSegmentOptions() {
  await requireModuleAccess('marketing');
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('segments')
      .select('id, name')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return { success: true as const, data: (data ?? []) as { id: string; name: string }[] };
  } catch (error: any) {
    logger.error({ err: error }, 'list.whatsapp_audience_segment_options.failed');
    return { success: false as const, error: 'Failed to load saved segments' };
  }
}

export async function createWhatsAppBroadcastCampaign(payload: CreateWhatsAppBroadcastPayload) {
  await requireModuleAccess('marketing');
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    if (!payload.name?.trim()) return { success: false as const, error: 'Campaign name is required' };
    if (!payload.messageBody?.trim() && !payload.templateName?.trim()) {
      return { success: false as const, error: 'Provide a free-text message, an approved template, or both' };
    }

    // New `audience` object, or the legacy segmentId / ruleGroup / tags inputs (same semantics as before B1a).
    const spec = payload.audience ? audienceFromInput(payload.audience) : audienceFromLegacy(payload);
    if (!spec) {
      return { success: false as const, error: 'Select an audience (all contacts, tags, a contact filter or a saved segment)' };
    }

    const supabase = await createServerClient();

    const { data: conn } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'whatsapp')
      .maybeSingle();
    if (!conn) return { success: false as const, error: 'Connect a WhatsApp Business account first (Settings > Integrations)' };

    // Read-only; a deleted/invalid saved segment or a lookup failure throws here, before any row is written.
    const resolved = await resolveBroadcastAudience(supabase, workspaceId, spec);

    // Every audience type needs the sender's consent attestation, enforced here and not only in the UI.
    if (payload.consentAttested !== true) {
      return { success: false as const, code: 'consent_attestation_required' as const, error: WHATSAPP_ATTESTATION_REQUIRED_MESSAGE };
    }

    const contactIds = resolved.contactIds;
    const excludedOptOut = resolved.exclusions.opted_out + resolved.exclusions.suppressed;
    if (contactIds.length === 0) {
      const top = topExclusionReason(resolved.exclusions);
      return {
        success: false as const,
        error: 'No eligible recipients matched this audience' + (top ? ` (most excluded: ${top})` : resolved.counts.matched === 0 ? ' (no contacts matched)' : ''),
      };
    }

    const schedule = resolveScheduledFor(payload.scheduledAt);
    if (schedule.ok === false) return { success: false as const, error: schedule.error };
    const scheduledFor = (schedule as { ok: true; iso: string }).iso;

    const now = new Date().toISOString();
    const audienceType = payload.audience ? payload.audience.type : 'legacy';
    const audienceDefinition = payload.audience
      ? payload.audience
      : { segmentId: payload.segmentId || null, ruleGroup: payload.ruleGroup || null, tags: payload.tags || null };
    const savedSegmentId = payload.audience
      ? (payload.audience.type === 'saved_segment' ? payload.audience.segmentId : null)
      : (payload.segmentId || null);
    const audienceTags = payload.audience
      ? (payload.audience.type === 'tags' ? payload.audience.tags : null)
      : (payload.tags || null);

    const { data: campaign, error: insertErr } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        message_body: payload.messageBody?.trim() || null,
        template_name: payload.templateName?.trim() || null,
        template_language: payload.templateName?.trim() ? (payload.templateLanguage?.trim() || 'en_US') : null,
        template_body_params: payload.templateName?.trim() && payload.templateBodyParams?.length ? payload.templateBodyParams : null,
        segment_id: savedSegmentId,
        rule_group: payload.audience ? null : (payload.ruleGroup || null),
        tags: audienceTags,
        scheduled_at: scheduledFor,
        status: 'scheduled',
        total_recipients: contactIds.length,
        total_skipped_opt_out: excludedOptOut,
        created_by: userId,
        audience_type: audienceType,
        audience_definition: audienceDefinition,
        audience_snapshot: { resolvedAt: now, counts: resolved.counts, exclusions: resolved.exclusions },
        compliance_ack: { userId, ts: now, textVersion: COMPLIANCE_TEXT_VERSION },
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

    const admin = createAdminClient();
    for (let i = 0; i < queueRows.length; i += QUEUE_INSERT_CHUNK) {
      const { error: queueErr } = await admin
        .from('whatsapp_dispatch_queue')
        .upsert(queueRows.slice(i, i + QUEUE_INSERT_CHUNK), { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true });
      if (queueErr) {
        logger.error({ err: queueErr, campaignId: campaign.id }, 'create.whatsapp_broadcast_campaign.queue_insert.failed');
        // Do not leave a "scheduled" campaign with only part of its audience queued.
        await admin.from('whatsapp_dispatch_queue').delete().eq('campaign_id', campaign.id);
        await admin.from('whatsapp_broadcast_campaigns').delete().eq('id', campaign.id);
        throw new Error('Failed to queue campaign recipients');
      }
    }

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const, data: campaign, recipientCount: contactIds.length, excludedOptOut, exclusions: resolved.exclusions };
  } catch (error: any) {
    logger.error({ err: error }, 'create.whatsapp_broadcast_campaign.failed');
    // Only errors authored for the user reach the client; driver/DB/network errors are replaced by a generic message.
    return { success: false as const, error: userSafeMessage(error, 'Failed to create WhatsApp campaign') };
  }
}

export async function cancelWhatsAppBroadcastCampaign(id: string) {
  await requireModuleAccess('marketing');
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: campaign, error: fetchErr } = await supabase
      .from('whatsapp_broadcast_campaigns')
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
      .from('whatsapp_dispatch_queue')
      .update({ status: 'failed', error_log: 'Cancelled by user' })
      .eq('campaign_id', id)
      .eq('status', 'pending');

    const { error: updateErr } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (updateErr) throw updateErr;

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'cancel.whatsapp_broadcast_campaign.failed');
    return { success: false as const, error: 'Failed to cancel campaign' };
  }
}

export async function deleteWhatsAppBroadcastCampaign(id: string) {
  await requireModuleAccess('marketing');
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: campaign } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    // Unknown id, or another workspace's campaign (hidden by RLS): never report success for a delete that did nothing.
    if (!campaign) return { success: false as const, error: 'Campaign not found' };
    if (campaign.status === 'sending') {
      return { success: false as const, error: 'Cannot delete a campaign that is currently sending' };
    }

    const { data: deleted, error } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id');
    if (error) throw error;
    if (!deleted || deleted.length === 0) return { success: false as const, error: 'Campaign not found' };

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.whatsapp_broadcast_campaign.failed');
    return { success: false as const, error: 'Failed to delete campaign' };
  }
}
