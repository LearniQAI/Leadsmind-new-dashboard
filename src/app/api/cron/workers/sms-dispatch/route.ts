import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { logger } from '@/shared/logger';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Mirrors campaign-dispatch/route.ts's structure exactly (atomic RPC-locked
// batch, exponential backoff, plain per-row UPDATE never .upsert() — see that
// file's comment on why upsert silently stalls partial-field updates against
// NOT NULL columns). Swaps sendEmail for sendSMS and adds one gate email
// doesn't need: contacts.sms_opt_out, checked per-row at send time (not just
// at enqueue time) so a STOP received between scheduling and dispatch is
// still honored.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = `sms_worker_${crypto.randomUUID()}`;
  const batchSize = 50;

  try {
    const { data: jobs, error: lockErr } = await supabaseAdmin.rpc('acquire_sms_jobs', {
      worker_id: workerId,
      batch_size: batchSize,
    });

    if (lockErr) {
      logger.error({ err: lockErr }, 'cron.sms_dispatch.jobs_acquire.failed');
      return NextResponse.json({ error: 'Lock acquisition failed' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty' });
    }

    const now = new Date();
    let sentCount = 0;

    const campaignIds = [...new Set(jobs.map((j: any) => j.campaign_id))];
    const { data: campaigns } = await supabaseAdmin
      .from('bulk_sms_campaigns')
      .select('id, workspace_id, message_body')
      .in('id', campaignIds);

    const workspaceIds = [...new Set(campaigns?.map((c: any) => c.workspace_id) || [])];
    const { data: workspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id, twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted, twilio_number')
      .in('id', workspaceIds);

    const contactIds = jobs.map((j: any) => j.contact_id);
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('id, phone, first_name, last_name, sms_opt_out, opted_out')
      .in('id', contactIds);

    const campaignsMap = new Map(campaigns?.map((c: any) => [c.id, c]));
    const workspacesMap = new Map(workspaces?.map((w: any) => [w.id, w]));
    const contactsMap = new Map(contacts?.map((c: any) => [c.id, c]));

    const updates: any[] = [];
    const sentIncrements: Record<string, number> = {};
    const failedIncrements: Record<string, number> = {};
    const optOutIncrements: Record<string, number> = {};

    for (const job of jobs) {
      const campaign = campaignsMap.get(job.campaign_id);
      const workspace = workspacesMap.get(job.workspace_id);
      const contact = contactsMap.get(job.contact_id);

      if (!campaign || !contact || !contact.phone) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Missing relational data', locked_by: null });
        failedIncrements[job.campaign_id] = (failedIncrements[job.campaign_id] || 0) + 1;
        continue;
      }

      // Re-check opt-out at send time, not just at enqueue time — a contact
      // can text STOP after this campaign was scheduled but before the cron
      // worker actually reaches their row.
      if (contact.sms_opt_out || contact.opted_out) {
        updates.push({ id: job.id, status: 'skipped_opt_out', locked_by: null });
        optOutIncrements[job.campaign_id] = (optOutIncrements[job.campaign_id] || 0) + 1;
        continue;
      }

      try {
        const cleanPhone = contact.phone.startsWith('+') ? contact.phone : `+${contact.phone}`;
        const result = await sendSMS({
          to: cleanPhone,
          message: campaign.message_body,
          config: {
            ...resolveWorkspaceTwilioCredentials(workspace),
            fromNumber: workspace?.twilio_number,
          },
        });

        updates.push({ id: job.id, status: 'sent', twilio_sid: result.sid, locked_by: null });
        sentIncrements[campaign.id] = (sentIncrements[campaign.id] || 0) + 1;
        sentCount++;
      } catch (sendErr: any) {
        const isHardFail = /invalid|auth|unsubscribed|blacklist/i.test(sendErr.message || '');
        const nextRetryCount = (job.retry_count || 0) + 1;

        if (isHardFail || nextRetryCount >= 3) {
          updates.push({ id: job.id, status: 'failed', error_log: sendErr.message, locked_by: null });
          failedIncrements[campaign.id] = (failedIncrements[campaign.id] || 0) + 1;
        } else {
          // Same backoff convention as campaign-dispatch: 15min, 60min, ...
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
      // Plain per-row UPDATE, not .upsert() — see campaign-dispatch/route.ts's
      // comment; a partial-field upsert against NOT NULL columns silently
      // fails to persist here too.
      const results = await Promise.all(
        updates.map((u) => {
          const { id: jobId, ...fields } = u;
          return supabaseAdmin.from('sms_dispatch_queue').update(fields).eq('id', jobId);
        })
      );
      const updateErr = results.find((r) => r.error)?.error;
      if (updateErr) {
        logger.error({ err: updateErr, workerId }, 'cron.sms_dispatch.queue_status_update.failed');
      }
    }

    const touchedCampaignIds = new Set([
      ...Object.keys(sentIncrements),
      ...Object.keys(failedIncrements),
      ...Object.keys(optOutIncrements),
    ]);
    for (const cid of touchedCampaignIds) {
      const { data: camp } = await supabaseAdmin
        .from('bulk_sms_campaigns')
        .select('total_sent, total_failed, total_skipped_opt_out')
        .eq('id', cid)
        .single();
      if (camp) {
        await supabaseAdmin
          .from('bulk_sms_campaigns')
          .update({
            total_sent: (camp.total_sent || 0) + (sentIncrements[cid] || 0),
            total_failed: (camp.total_failed || 0) + (failedIncrements[cid] || 0),
            total_skipped_opt_out: (camp.total_skipped_opt_out || 0) + (optOutIncrements[cid] || 0),
          })
          .eq('id', cid);
      }
    }

    // Mark 'completed' once every queue row for the campaign has reached a
    // terminal state (sent/failed/skipped_opt_out) — same convergence logic
    // as campaign-dispatch, may take several worker runs for large campaigns.
    for (const cid of campaignIds) {
      const { count: remaining } = await supabaseAdmin
        .from('sms_dispatch_queue')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .in('status', ['pending', 'processing']);

      if ((remaining ?? 0) === 0) {
        const { data: campToClose } = await supabaseAdmin
          .from('bulk_sms_campaigns')
          .select('status')
          .eq('id', cid)
          .single();
        if (campToClose && !['completed', 'cancelled'].includes(campToClose.status)) {
          await supabaseAdmin
            .from('bulk_sms_campaigns')
            .update({ status: 'completed', sent_at: now.toISOString() })
            .eq('id', cid);
        }
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length, sent: sentCount });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.sms_dispatch.failed');
    return NextResponse.json({ error: 'SMS dispatch worker failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
