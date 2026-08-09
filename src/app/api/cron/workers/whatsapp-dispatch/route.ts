import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { isWithinWhatsAppSessionWindow } from '@/lib/meta/whatsappWindow';
import { logger } from '@/shared/logger';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function replaceTokens(str: string, contact: any): string {
  return str.replace(/\{\{contact\.([^}]+)\}\}/g, (_, field) => contact?.[field] ?? '');
}

// Mirrors sms-dispatch/route.ts's structure exactly (atomic RPC-locked batch,
// exponential backoff, plain per-row UPDATE). Adds the one real difference
// WhatsApp has and SMS doesn't: per-contact 24h session-window resolution —
// inside the window a campaign's free-text body is used (if set), outside it
// only the campaign's approved template can legally be sent; a contact with
// neither available is skipped as skipped_no_template rather than silently
// dropped or force-sent as free text (which Meta would reject anyway).
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = `whatsapp_worker_${crypto.randomUUID()}`;
  const batchSize = 50;

  try {
    const { data: jobs, error: lockErr } = await supabaseAdmin.rpc('acquire_whatsapp_jobs', {
      worker_id: workerId,
      batch_size: batchSize,
    });

    if (lockErr) {
      logger.error({ err: lockErr }, 'cron.whatsapp_dispatch.jobs_acquire.failed');
      return NextResponse.json({ error: 'Lock acquisition failed' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty' });
    }

    const now = new Date();
    let sentCount = 0;

    const campaignIds = [...new Set(jobs.map((j: any) => j.campaign_id))];
    const { data: campaigns } = await supabaseAdmin
      .from('whatsapp_broadcast_campaigns')
      .select('id, workspace_id, message_body, template_name, template_language, template_body_params')
      .in('id', campaignIds);

    const workspaceIds = [...new Set(campaigns?.map((c: any) => c.workspace_id) || [])];
    const { data: connections } = await supabaseAdmin
      .from('platform_connections')
      .select('workspace_id, credentials')
      .eq('platform', 'whatsapp')
      .in('workspace_id', workspaceIds);

    const contactIds = jobs.map((j: any) => j.contact_id);
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, first_name, last_name, opted_out')
      .in('id', contactIds);

    // 24h-window clock per contact — the same field
    // processInboundComplianceAndWindow() in webhooks/meta/route.ts updates
    // on every inbound WhatsApp message.
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('contact_id, workspace_id, last_customer_message_at')
      .eq('platform', 'whatsapp')
      .in('contact_id', contactIds)
      .in('workspace_id', workspaceIds);

    const campaignsMap = new Map(campaigns?.map((c: any) => [c.id, c]));
    const connectionsMap = new Map(connections?.map((c: any) => [c.workspace_id, c]));
    const contactsMap = new Map(contacts?.map((c: any) => [c.id, c]));
    const windowMap = new Map(conversations?.map((c: any) => [c.contact_id, c.last_customer_message_at]));

    const updates: any[] = [];
    const sentIncrements: Record<string, number> = {};
    const failedIncrements: Record<string, number> = {};
    const optOutIncrements: Record<string, number> = {};
    const noTemplateIncrements: Record<string, number> = {};

    for (const job of jobs) {
      const campaign = campaignsMap.get(job.campaign_id);
      const connection = connectionsMap.get(job.workspace_id);
      const contact = contactsMap.get(job.contact_id);

      if (!campaign || !contact || !contact.phone) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Missing relational data', locked_by: null });
        failedIncrements[job.campaign_id] = (failedIncrements[job.campaign_id] || 0) + 1;
        continue;
      }

      if (!connection?.credentials) {
        updates.push({ id: job.id, status: 'failed', error_log: 'WhatsApp connection not configured', locked_by: null });
        failedIncrements[job.campaign_id] = (failedIncrements[job.campaign_id] || 0) + 1;
        continue;
      }

      // Re-check opt-out at send time, not just enqueue time — same reasoning
      // as sms-dispatch's contact.sms_opt_out re-check.
      if (contact.opted_out) {
        updates.push({ id: job.id, status: 'skipped_opt_out', locked_by: null });
        optOutIncrements[job.campaign_id] = (optOutIncrements[job.campaign_id] || 0) + 1;
        continue;
      }

      const inWindow = isWithinWhatsAppSessionWindow(windowMap.get(job.contact_id));
      const adapter = new MetaAdapter(connection.credentials);
      const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;

      try {
        let result: { success: boolean; externalId?: string; error?: string };
        let usedTemplate: boolean;

        if (inWindow && campaign.message_body) {
          usedTemplate = false;
          result = await adapter.sendWhatsApp(cleanPhone, replaceTokens(campaign.message_body, contact));
        } else if (campaign.template_name) {
          usedTemplate = true;
          const params = (campaign.template_body_params || []).map((p: string) => replaceTokens(p, contact));
          result = await adapter.sendWhatsAppTemplate(cleanPhone, campaign.template_name, campaign.template_language || 'en_US', params);
        } else {
          // Out of window with no approved template configured — cannot
          // legally free-text this contact, and there's nothing else to send.
          updates.push({ id: job.id, status: 'skipped_no_template', locked_by: null });
          noTemplateIncrements[job.campaign_id] = (noTemplateIncrements[job.campaign_id] || 0) + 1;
          continue;
        }

        if (!result.success) throw new Error(result.error || 'WhatsApp send failed');

        updates.push({ id: job.id, status: 'sent', whatsapp_message_id: result.externalId, was_template: usedTemplate, locked_by: null });
        sentIncrements[campaign.id] = (sentIncrements[campaign.id] || 0) + 1;
        sentCount++;
      } catch (sendErr: any) {
        const isHardFail = /invalid|auth|unsubscribed|blacklist|template/i.test(sendErr.message || '');
        const nextRetryCount = (job.retry_count || 0) + 1;

        if (isHardFail || nextRetryCount >= 3) {
          updates.push({ id: job.id, status: 'failed', error_log: sendErr.message, locked_by: null });
          failedIncrements[campaign.id] = (failedIncrements[campaign.id] || 0) + 1;
        } else {
          const backoffMinutes = Math.pow(4, nextRetryCount) * 15;
          const nextTime = new Date(now.getTime() + backoffMinutes * 60000);
          updates.push({
            id: job.id,
            status: 'pending',
            retry_count: nextRetryCount,
            scheduled_for: nextTime.toISOString(),
            error_log: sendErr.message,
            locked_by: null,
          });
        }
      }
    }

    if (updates.length > 0) {
      const results = await Promise.all(
        updates.map((u) => {
          const { id: jobId, ...fields } = u;
          return supabaseAdmin.from('whatsapp_dispatch_queue').update(fields).eq('id', jobId);
        })
      );
      const updateErr = results.find((r) => r.error)?.error;
      if (updateErr) {
        logger.error({ err: updateErr, workerId }, 'cron.whatsapp_dispatch.queue_status_update.failed');
      }
    }

    const touchedCampaignIds = new Set([
      ...Object.keys(sentIncrements),
      ...Object.keys(failedIncrements),
      ...Object.keys(optOutIncrements),
      ...Object.keys(noTemplateIncrements),
    ]);
    for (const cid of touchedCampaignIds) {
      const { data: camp } = await supabaseAdmin
        .from('whatsapp_broadcast_campaigns')
        .select('total_sent, total_failed, total_skipped_opt_out, total_skipped_no_template')
        .eq('id', cid)
        .single();
      if (camp) {
        await supabaseAdmin
          .from('whatsapp_broadcast_campaigns')
          .update({
            total_sent: (camp.total_sent || 0) + (sentIncrements[cid] || 0),
            total_failed: (camp.total_failed || 0) + (failedIncrements[cid] || 0),
            total_skipped_opt_out: (camp.total_skipped_opt_out || 0) + (optOutIncrements[cid] || 0),
            total_skipped_no_template: (camp.total_skipped_no_template || 0) + (noTemplateIncrements[cid] || 0),
          })
          .eq('id', cid);
      }
    }

    for (const cid of campaignIds) {
      const { count: remaining } = await supabaseAdmin
        .from('whatsapp_dispatch_queue')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .in('status', ['pending', 'processing']);

      if ((remaining ?? 0) === 0) {
        const { data: campToClose } = await supabaseAdmin
          .from('whatsapp_broadcast_campaigns')
          .select('status')
          .eq('id', cid)
          .single();
        if (campToClose && !['completed', 'cancelled'].includes(campToClose.status)) {
          await supabaseAdmin
            .from('whatsapp_broadcast_campaigns')
            .update({ status: 'completed', sent_at: now.toISOString() })
            .eq('id', cid);
        }
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length, sent: sentCount });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.whatsapp_dispatch.failed');
    return NextResponse.json({ error: 'WhatsApp dispatch worker failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
