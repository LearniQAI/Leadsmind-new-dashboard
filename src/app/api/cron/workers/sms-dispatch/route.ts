import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendSMS, SmsOptedOutError } from '@/lib/sms';
import { normalizePhone } from '@/lib/phone';
import { renderSmsBody } from '@/lib/smsMessage';
import { recordSmsOptOut } from '@/lib/smsOptOut';
import { smsStatusCallbackUrl } from '@/lib/twilio/inboundWebhook';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { logger } from '@/shared/logger';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Queue row statuses: pending -> processing -> sent | failed | skipped_opt_out |
// skipped_invalid_number | cancelled (delivered/undelivered is tracked separately in
// delivery_status by the Twilio status callback).
// Campaign lifecycle: scheduled -> sending (first batch is claimed) -> completed | failed (every row
// terminal; 'failed' only when nothing at all was sent and something failed) | cancelled (by the user).
//
// Mirrors campaign-dispatch/route.ts (atomic RPC-locked batch, exponential backoff, plain per-row
// UPDATE, never .upsert()). Adds what email does not need: the STOP opt-out gate (also enforced inside
// sendSMS itself), per-recipient merge tags, a fresh cancel check before every send, and Twilio
// delivery-status callbacks.

// A send failure that retrying can never fix. (Previously "Twilio is not configured for this
// workspace" was retried three times over ~75 minutes.)
const HARD_FAIL = /invalid|auth|unsubscribed|blacklist|not configured|not connected/i;
const TWILIO_RECIPIENT_UNSUBSCRIBED = 21610;

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

    const campaignIds = [...new Set(jobs.map((j: any) => j.campaign_id))] as string[];

    // A campaign whose rows are now being dispatched is "sending" (this status used to be defined and
    // even guarded on -- delete is blocked while sending -- but never actually set). Conditional, so a
    // cancelled campaign is never resurrected.
    await supabaseAdmin.from('bulk_sms_campaigns').update({ status: 'sending' }).in('id', campaignIds).eq('status', 'scheduled');

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
      .select('id, phone, first_name, last_name, company, email, sms_opt_out, opted_out, sms_invalid')
      .in('id', contactIds);

    const campaignsMap = new Map(campaigns?.map((c: any) => [c.id, c]));
    const workspacesMap = new Map(workspaces?.map((w: any) => [w.id, w]));
    const contactsMap = new Map(contacts?.map((c: any) => [c.id, c]));
    const statusCallback = smsStatusCallbackUrl() ?? undefined;

    const updates: any[] = [];

    for (const job of jobs) {
      const campaign = campaignsMap.get(job.campaign_id);
      const workspace = workspacesMap.get(job.workspace_id);
      const contact = contactsMap.get(job.contact_id);

      if (!campaign || !contact || !contact.phone) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Missing relational data', locked_by: null });
        continue;
      }

      // Cancel takes effect on every row this worker has claimed but not yet sent: the campaign's
      // status is re-read fresh before EACH send. (A message already handed to Twilio cannot be recalled.)
      const { data: live } = await supabaseAdmin.from('bulk_sms_campaigns').select('status').eq('id', job.campaign_id).maybeSingle();
      if (live?.status === 'cancelled') {
        updates.push({ id: job.id, status: 'cancelled', error_log: 'Cancelled by user', locked_by: null });
        continue;
      }

      // Re-check opt-out at send time, not just at enqueue time — a contact can text STOP after this
      // campaign was scheduled. (sendSMS also enforces the durable suppression list.)
      if (contact.sms_opt_out || contact.opted_out) {
        updates.push({ id: job.id, status: 'skipped_opt_out', locked_by: null });
        continue;
      }
      // Same re-check for a number flagged invalid (repeated permanent-shaped delivery failures)
      // between scheduling and dispatch — no point re-attempting a number Twilio has already told us
      // repeatedly cannot receive SMS.
      if (contact.sms_invalid) {
        updates.push({ id: job.id, status: 'skipped_invalid_number', locked_by: null });
        continue;
      }

      // The workspace's Twilio account/number can be removed after scheduling: fail the row permanently
      // and clearly instead of retrying a certain failure for over an hour.
      let creds: { accountSid?: string; authToken?: string } = {};
      try { creds = resolveWorkspaceTwilioCredentials(workspace); } catch { /* unreadable credentials == none */ }
      if (!creds.accountSid || !creds.authToken || !workspace?.twilio_number) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Twilio is not configured for this workspace', locked_by: null });
        continue;
      }

      // Stored phones are often local ("082 123 4567"); normalise to E.164, and fail the row clearly
      // if it cannot be resolved.
      const cleanPhone = normalizePhone(contact.phone);
      if (!cleanPhone) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Invalid phone number (cannot be converted to international format)', locked_by: null });
        continue;
      }

      // Duplicate-send protection (Twilio has no idempotency key for messages): stamp the row BEFORE
      // calling Twilio, first attempt only. If a worker dies after Twilio accepted the message but
      // before this row is marked sent, the reclaimed row (or a retry after a timeout) finds this stamp
      // and sendSMS first adopts the message that already exists instead of sending a second one.
      const priorAttemptAt: string | null = !job.twilio_sid ? (job.send_started_at ?? null) : null;
      if (!job.send_started_at) {
        await supabaseAdmin.from('sms_dispatch_queue').update({ send_started_at: new Date().toISOString() }).eq('id', job.id).is('send_started_at', null);
      }

      try {
        const result = await sendSMS({
          workspaceId: job.workspace_id,
          dedupeSince: priorAttemptAt ?? undefined,
          to: cleanPhone,
          // Merge tags ({{first_name}} etc.) resolved per recipient, same resolver as email.
          message: renderSmsBody(campaign.message_body, contact),
          statusCallback,
          config: { ...creds, fromNumber: workspace.twilio_number },
        });

        updates.push({ id: job.id, status: 'sent', twilio_sid: result.sid, locked_by: null });
        sentCount++;
      } catch (sendErr: any) {
        // sendSMS itself refuses a blocked number (opt-out OR invalid, durable list + contact flags),
        // which covers a STOP or an invalid-number flag recorded after this batch's contact rows were
        // read. Reported under the right bucket so the campaign card doesn't call a dead number an
        // "opt-out" or vice versa.
        if (sendErr instanceof SmsOptedOutError) {
          updates.push({ id: job.id, status: sendErr.reason === 'invalid_number' ? 'skipped_invalid_number' : 'skipped_opt_out', locked_by: null });
          continue;
        }
        // Twilio itself refused: the recipient already replied STOP to Twilio. Record it as our own opt-out.
        if (sendErr?.code === TWILIO_RECIPIENT_UNSUBSCRIBED) {
          try {
            await recordSmsOptOut(supabaseAdmin, { workspaceId: job.workspace_id, phone: cleanPhone, source: 'twilio_error_21610' });
          } catch (optErr) {
            logger.error({ err: optErr }, 'cron.sms_dispatch.record_opt_out.failed');
          }
          updates.push({ id: job.id, status: 'skipped_opt_out', locked_by: null });
          continue;
        }

        const isHardFail = HARD_FAIL.test(sendErr.message || '');
        const nextRetryCount = (job.retry_count || 0) + 1;

        if (isHardFail || nextRetryCount >= 3) {
          updates.push({ id: job.id, status: 'failed', error_log: sendErr.message, locked_by: null });
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
      // Plain per-row UPDATE, not .upsert() — see campaign-dispatch/route.ts's comment; a partial-field
      // upsert against NOT NULL columns silently fails to persist here too.
      const flush = (u: any) => {
        const { id: jobId, ...fields } = u;
        return supabaseAdmin.from('sms_dispatch_queue').update(fields).eq('id', jobId);
      };
      const results = await Promise.all(updates.map(flush));
      // A row update can fail transiently (network). A row that WAS sent but stays 'processing' would be
      // reclaimed after 5 minutes and sent again, so retry each failed update once before giving up.
      for (let i = 0; i < results.length; i++) {
        if (!results[i].error) continue;
        const retry = await flush(updates[i]);
        if (retry.error) logger.error({ err: retry.error, workerId, jobId: updates[i].id }, 'cron.sms_dispatch.queue_status_update.failed');
      }
    }

    // Campaign totals come from refresh_sms_campaign_totals: it locks the campaign row, counts the queue
    // rows and writes the totals in one transaction, so concurrent workers can neither lose an increment
    // nor overwrite a newer total with an older one. Then close the campaign once every row is terminal;
    // the final status reflects the OUTCOME (nothing sent + something failed = 'failed'), and the update
    // is conditional so a cancelled campaign is never resurrected.
    for (const cid of campaignIds) {
      const { data: t, error: refreshErr } = await supabaseAdmin.rpc('refresh_sms_campaign_totals', { p_campaign_id: cid });
      if (refreshErr) { logger.error({ err: refreshErr, campaignId: cid }, 'cron.sms_dispatch.totals_refresh.failed'); continue; }
      if (!t || t.open !== 0) continue;
      await supabaseAdmin
        .from('bulk_sms_campaigns')
        .update({ status: t.sent === 0 && t.failed > 0 ? 'failed' : 'completed', sent_at: now.toISOString() })
        .eq('id', cid)
        .in('status', ['scheduled', 'sending']);
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
