import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { parsePersonalTokens } from '@/lib/builder/emailRenderer';
import { buildUnsubscribeLink } from '@/lib/email/unsubscribeLink';
import { PredictiveIntelligence } from '@/lib/intelligence/PredictiveIntelligence';
import { Observability } from '@/lib/observability';
import { logger } from '@/shared/logger';
import crypto from 'crypto';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return await Observability.traceWorker('campaign_dispatch_worker', {}, async () => {
    try {
      const workerId = `worker_${crypto.randomUUID()}`;
    const batchSize = 50;

    // 1. Acquire Jobs with Atomic Lock
    const { data: jobs, error: lockErr } = await supabaseAdmin.rpc('acquire_campaign_jobs', {
      worker_id: workerId,
      batch_size: batchSize
    });

    if (lockErr) {
      logger.error({ err: lockErr }, 'cron.campaign_dispatch.jobs_acquire.failed');
      return NextResponse.json({ error: 'Lock acquisition failed' }, { status: 500 });
    }

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty' });
    }

    const now = new Date();
    let sentCount = 0;

    // Pre-fetch campaign and workspace data to avoid N+1 queries
    const campaignIds = [...new Set(jobs.map((j: any) => j.campaign_id))];
    const { data: campaigns } = await supabaseAdmin
      .from('email_campaigns')
      .select('id, workspace_id, subject, body_html, from_email, from_name')
      .in('id', campaignIds);

    const workspaceIds = [...new Set(campaigns?.map(c => c.workspace_id) || [])];
    const { data: workspaces } = await supabaseAdmin
      .from('workspaces')
      .select('id, resend_api_key, email_from_address')
      .in('id', workspaceIds);

    const campaignsMap = new Map(campaigns?.map((c: any) => [c.id, c]));
    const workspacesMap = new Map(workspaces?.map((w: any) => [w.id, w]));

    // Pre-fetch contacts
    const contactIds = jobs.map((j: any) => j.contact_id);
    const { data: contacts } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .in('id', contactIds);
      
    const contactsMap = new Map(contacts?.map((c: any) => [c.id, c]));

    const updates = [];
    const campaignSentIncrements: Record<string, number> = {};

    // 2. Process Jobs
    for (const job of jobs) {
      const campaign = campaignsMap.get(job.campaign_id);
      const workspace = workspacesMap.get(job.workspace_id);
      const contact = contactsMap.get(job.contact_id);

      if (!campaign || !contact || !contact.email) {
        updates.push({ id: job.id, status: 'failed', error_log: 'Missing relational data', locked_by: null });
        continue;
      }

      const apiKey = workspace?.resend_api_key || process.env.RESEND_API_KEY;
      const fromEmail = campaign.from_email || workspace?.email_from_address || 'onboarding@resend.dev';

      // Predictive Scheduling Check
      const optimizedTime = await PredictiveIntelligence.getOptimizedSendTime(contact, now);
      if (optimizedTime.getTime() > now.getTime()) {
        updates.push({ 
           id: job.id, 
           status: 'deferred', 
           scheduled_for: optimizedTime.toISOString(), 
           locked_by: null 
        });
        continue;
      }

      try {
        // Personalize per-recipient at the moment of actual send — body_html
        // is stored with {{tokens}} intact (see EmailBuilderClient's
        // skipPersonalization), never pre-resolved against a shared/empty
        // contact. String templating on one HTML doc per recipient; cheap
        // relative to the network round-trip to Resend that follows it.
        const personalizedHtml = parsePersonalTokens(campaign.body_html || '<p></p>', contact, {
          unsubscribe_link: buildUnsubscribeLink(contact.email, job.workspace_id)
        });

        await sendEmail({
          to: contact.email,
          subject: campaign.subject,
          html: personalizedHtml,
          config: {
            apiKey,
            fromEmail,
            fromName: campaign.from_name || 'LeadsMind',
            tags: [
              { name: 'campaign_id', value: campaign.id },
              { name: 'contact_id', value: contact.id },
              { name: 'queue_job_id', value: job.id }
            ]
          }
        });
        
        updates.push({ id: job.id, status: 'sent', locked_by: null });
        campaignSentIncrements[campaign.id] = (campaignSentIncrements[campaign.id] || 0) + 1;
        sentCount++;
      } catch (sendErr: any) {
        const isHardFail = sendErr.message.includes('invalid') || sendErr.message.includes('auth');
        const nextRetryCount = job.retry_count + 1;
        
        if (isHardFail || nextRetryCount >= 3) {
           updates.push({ id: job.id, status: 'failed', error_log: sendErr.message, locked_by: null });
        } else {
           // Exponential backoff: retry in 15 mins, 60 mins, etc.
           const backoffMinutes = Math.pow(4, nextRetryCount) * 15;
           const nextTime = new Date(now.getTime() + backoffMinutes * 60000);
           updates.push({ id: job.id, status: 'pending', retry_count: nextRetryCount, scheduled_for: nextTime.toISOString(), error_log: sendErr.message, locked_by: null });
        }
      }
    }

    // 3. Batch Update Queue
    // Plain per-row UPDATE, not .upsert(): these `updates` entries are
    // partial (id + a few changed fields, e.g. {id, status, locked_by}),
    // never the full row. .upsert(..., {onConflict:'id'}) issues a real
    // INSERT ... ON CONFLICT DO UPDATE under the hood, and Postgres
    // validates the INSERT's column list against NOT NULL constraints
    // (campaign_id/workspace_id/contact_id) before the ON CONFLICT branch
    // ever runs — so a partial object here always failed with a
    // not-null-constraint error, leaving the row stuck at 'processing'
    // forever. Confirmed live: every job that hit any non-'sent' branch
    // (deferred/failed/retry) never actually persisted its new status.
    if (updates.length > 0) {
      const results = await Promise.all(
        updates.map(u => {
          const { id: jobId, ...fields } = u as any;
          return supabaseAdmin.from('campaign_dispatch_queue').update(fields).eq('id', jobId);
        })
      );
      const updateErr = results.find(r => r.error)?.error;
      if (updateErr) {
         logger.error({ err: updateErr, workerId }, 'cron.campaign_dispatch.queue_status_update.failed');
      }
    }

    // 4. Update Campaign Counts (Naive increment, would be better as RPC)
    for (const [cid, count] of Object.entries(campaignSentIncrements)) {
       const { data: camp } = await supabaseAdmin.from('email_campaigns').select('total_sent').eq('id', cid).single();
       if (camp) {
          await supabaseAdmin.from('email_campaigns').update({ total_sent: (camp.total_sent || 0) + count }).eq('id', cid);
       }
    }

    // 5. Mark campaigns 'sent' once every one of their queue rows has reached
    // a terminal state (sent/failed) — status must reflect what the queue
    // actually did, not a manual, disconnected flag. A campaign whose queue
    // still has any pending/processing/deferred row is left alone; this may
    // take several worker runs to converge for large campaigns, which is
    // correct — it should only flip once genuinely done.
    for (const cid of campaignIds) {
      const { count: remaining } = await supabaseAdmin
        .from('campaign_dispatch_queue')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', cid)
        .in('status', ['pending', 'processing', 'deferred']);

      if ((remaining ?? 0) === 0) {
        const { data: campToClose } = await supabaseAdmin
          .from('email_campaigns')
          .select('status')
          .eq('id', cid)
          .single();
        if (campToClose && campToClose.status !== 'sent') {
          await supabaseAdmin
            .from('email_campaigns')
            .update({ status: 'sent', sent_at: now.toISOString() })
            .eq('id', cid);
        }
      }
    }

    return NextResponse.json({ success: true, processed: jobs.length, sent: sentCount });
  } catch (error: any) {
    Observability.captureError(error, 'critical', { provider: 'worker' });
    logger.error({ err: error }, 'cron.campaign_dispatch.failed');
    return NextResponse.json({ error: 'Campaign dispatch worker failed.' }, { status: 500 });
  }
  });
}

export async function POST(req: Request) {
  return GET(req);
}
