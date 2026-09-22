import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { MetaAdapter } from '@/lib/meta/MetaAdapter';
import { isWithinWhatsAppSessionWindow } from '@/lib/meta/whatsappWindow';
import { logger } from '@/shared/logger';
import { normalizePhone } from '@/lib/phone';
import { getSmsOptOutReason } from '@/lib/smsOptOut';
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
      .select('id, phone, first_name, last_name, opted_out, sms_opt_out')
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

    for (const job of jobs) {
      const campaign = campaignsMap.get(job.campaign_id);
      const connection = connectionsMap.get(job.workspace_id);
      const contact = contactsMap.get(job.contact_id);

      if (!campaign || !contact || !contact.phone) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Missing relational data', locked_by: null });
        continue;
      }

      if (!connection?.credentials) {
        updates.push({ id: job.id, status: 'failed', error_log: 'WhatsApp connection not configured', locked_by: null });
        continue;
      }

      // Re-check opt-out at send time, not just enqueue time — same reasoning
      // as sms-dispatch's contact.sms_opt_out re-check.
      if (contact.opted_out || contact.sms_opt_out) {
        updates.push({ id: job.id, status: 'skipped_opt_out', locked_by: null });
        continue;
      }
      // Opt-out is unified across SMS and WhatsApp and lives durably in sms_suppression_list too (it
      // survives a contact being deleted and re-imported). This worker sends through Meta, NOT through
      // sendSMS, so it does not get sendSMS's gate for free: check it here. Fails closed on a lookup error.
      let optOutReason: string | null = null;
      try {
        optOutReason = await getSmsOptOutReason(supabaseAdmin, job.workspace_id, contact.phone);
      } catch (optErr: any) {
        updates.push({ id: job.id, status: 'pending', retry_count: (job.retry_count || 0) + 1, scheduled_for: new Date(now.getTime() + 15 * 60000).toISOString(), error_log: 'Could not verify opt-out status; will retry', locked_by: null });
        logger.error({ err: optErr }, 'cron.whatsapp_dispatch.opt_out_lookup.failed');
        continue;
      }
      if (optOutReason) {
        updates.push({ id: job.id, status: 'skipped_opt_out', locked_by: null });
        continue;
      }

      const inWindow = isWithinWhatsAppSessionWindow(windowMap.get(job.contact_id));
      const adapter = new MetaAdapter(connection.credentials);
      // Stored phones are often local ("082 123 4567"); '+' + phone made those invalid. Normalise to E.164.
      const cleanPhone = normalizePhone(contact.phone);
      if (!cleanPhone) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Invalid phone number (cannot be converted to international format)', locked_by: null });
        continue;
      }

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
          continue;
        }

        if (!result.success) throw new Error(result.error || 'WhatsApp send failed');

        updates.push({ id: job.id, status: 'sent', whatsapp_message_id: result.externalId, was_template: usedTemplate, locked_by: null });
        sentCount++;
      } catch (sendErr: any) {
        const isHardFail = /invalid|auth|unsubscribed|blacklist|template/i.test(sendErr.message || '');
        const nextRetryCount = (job.retry_count || 0) + 1;

        if (isHardFail || nextRetryCount >= 3) {
          updates.push({ id: job.id, status: 'failed', error_log: sendErr.message, locked_by: null });
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
      const flush = (u: any) => {
        const { id: jobId, ...fields } = u;
        return supabaseAdmin.from('whatsapp_dispatch_queue').update(fields).eq('id', jobId);
      };
      const results = await Promise.all(updates.map(flush));
      // A row update can fail transiently (network). A row that WAS sent but stays 'processing' would be
      // reclaimed after 5 minutes and sent again, so retry each failed update once before giving up.
      for (let i = 0; i < results.length; i++) {
        if (!results[i].error) continue;
        const retry = await flush(updates[i]);
        if (retry.error) logger.error({ err: retry.error, workerId, jobId: updates[i].id }, 'cron.whatsapp_dispatch.queue_status_update.failed');
      }
    }

    // Campaign totals come from refresh_whatsapp_campaign_totals: it locks the campaign row, counts the
    // queue rows and writes the totals in one transaction, so concurrent workers can neither lose an
    // increment (the old read-then-write did) nor overwrite a newer total with an older one. Then close the
    // campaign once every row is terminal ('failed' when nothing was sent and something failed); the update
    // is conditional so a cancelled campaign is never resurrected.
    for (const cid of campaignIds) {
      const { data: t, error: refreshErr } = await supabaseAdmin.rpc('refresh_whatsapp_campaign_totals', { p_campaign_id: cid });
      if (refreshErr) { logger.error({ err: refreshErr, campaignId: cid }, 'cron.whatsapp_dispatch.totals_refresh.failed'); continue; }
      if (!t || t.open !== 0) continue;
      await supabaseAdmin
        .from('whatsapp_broadcast_campaigns')
        .update({ status: t.sent === 0 && t.failed > 0 ? 'failed' : 'completed', sent_at: now.toISOString() })
        .eq('id', cid)
        .in('status', ['scheduled', 'sending']);
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
