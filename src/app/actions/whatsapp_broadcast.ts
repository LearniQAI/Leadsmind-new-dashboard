'use server';

// WhatsApp Broadcast Lists — Task 43. Audience resolution and the
// dispatch-queue shape deliberately mirror bulk_sms.ts (which itself mirrors
// email_campaigns/campaign_dispatch_queue) — same SegmentationCompiler +
// tag_assignments audience reuse, same admin-client queue insert pattern.
// Two differences from Bulk SMS: (1) consent gates on contacts.opted_out,
// the WhatsApp-specific field already maintained by
// processInboundComplianceAndWindow() in webhooks/meta/route.ts — NOT
// sms_opt_out, which is Twilio SMS's own field; (2) a campaign can carry a
// free-text body AND/OR an approved template — the cron worker picks per
// contact based on their 24h session-window status at send time (see
// whatsapp-dispatch/route.ts).

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { decrypt } from '@/lib/encryption';
import { SegmentationCompiler, RuleGroup } from '@/lib/intelligence/SegmentationCompiler';

export interface CreateWhatsAppBroadcastPayload {
  name: string;
  messageBody?: string | null;
  templateName?: string | null;
  templateLanguage?: string | null;
  templateBodyParams?: string[] | null;
  segmentId?: string | null;
  ruleGroup?: RuleGroup | null;
  tags?: string[];
  scheduledAt?: string | null;
}

export async function listWhatsAppBroadcastCampaigns() {
  try {
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

    const wabaId = conn.credentials.whatsapp_business_account_id || '';
    const encryptedToken = conn.credentials.system_user_access_token_encrypted || conn.credentials.access_token_encrypted || '';

    if (wabaId.startsWith('mock_') || !encryptedToken) {
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
    return { success: false as const, error: error.message || 'Failed to fetch WhatsApp templates' };
  }
}

// Mirrors bulk_sms.ts's resolveAudience() exactly, swapping the sms_opt_out
// gate for opted_out.
async function resolveAudience(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  workspaceId: string,
  payload: Pick<CreateWhatsAppBroadcastPayload, 'segmentId' | 'ruleGroup' | 'tags'>
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
    .select('id, phone, opted_out')
    .in('id', Array.from(matchedIds));
  if (eligErr) throw eligErr;

  const withPhone = (eligible ?? []).filter((c: any) => !!c.phone);
  const excludedOptOut = withPhone.filter((c: any) => c.opted_out).length;
  const contactIds = withPhone.filter((c: any) => !c.opted_out).map((c: any) => c.id);

  return { contactIds, excludedOptOut };
}

export async function createWhatsAppBroadcastCampaign(payload: CreateWhatsAppBroadcastPayload) {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    if (!payload.name?.trim()) return { success: false as const, error: 'Campaign name is required' };
    if (!payload.messageBody?.trim() && !payload.templateName?.trim()) {
      return { success: false as const, error: 'Provide a free-text message, an approved template, or both' };
    }
    if (!payload.segmentId && !payload.ruleGroup && !(payload.tags && payload.tags.length > 0)) {
      return { success: false as const, error: 'Select an audience (segment, rule, or tags)' };
    }

    const supabase = await createServerClient();

    const { data: conn } = await supabase
      .from('platform_connections')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'whatsapp')
      .maybeSingle();
    if (!conn) return { success: false as const, error: 'Connect a WhatsApp Business account first (Settings > Integrations)' };

    const { contactIds, excludedOptOut } = await resolveAudience(supabase, workspaceId, payload);
    if (contactIds.length === 0) {
      return { success: false as const, error: 'No eligible recipients matched this audience (check opt-outs and missing phone numbers)' };
    }

    const scheduledFor = payload.scheduledAt ? new Date(payload.scheduledAt).toISOString() : new Date().toISOString();

    const { data: campaign, error: insertErr } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        message_body: payload.messageBody?.trim() || null,
        template_name: payload.templateName?.trim() || null,
        template_language: payload.templateName?.trim() ? (payload.templateLanguage?.trim() || 'en_US') : null,
        template_body_params: payload.templateName?.trim() && payload.templateBodyParams?.length ? payload.templateBodyParams : null,
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

    const admin = createAdminClient();
    const { error: queueErr } = await admin
      .from('whatsapp_dispatch_queue')
      .upsert(queueRows, { onConflict: 'campaign_id,contact_id', ignoreDuplicates: true });
    if (queueErr) {
      logger.error({ err: queueErr, campaignId: campaign.id }, 'create.whatsapp_broadcast_campaign.queue_insert.failed');
      throw new Error('Failed to queue campaign recipients');
    }

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const, data: campaign, recipientCount: contactIds.length, excludedOptOut };
  } catch (error: any) {
    logger.error({ err: error }, 'create.whatsapp_broadcast_campaign.failed');
    return { success: false as const, error: error.message || 'Failed to create WhatsApp campaign' };
  }
}

export async function cancelWhatsAppBroadcastCampaign(id: string) {
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
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: campaign } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .select('status')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();
    if (campaign && campaign.status === 'sending') {
      return { success: false as const, error: 'Cannot delete a campaign that is currently sending' };
    }

    const { error } = await supabase
      .from('whatsapp_broadcast_campaigns')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw error;

    revalidatePath('/whatsapp-broadcasts');
    return { success: true as const };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.whatsapp_broadcast_campaign.failed');
    return { success: false as const, error: 'Failed to delete campaign' };
  }
}
