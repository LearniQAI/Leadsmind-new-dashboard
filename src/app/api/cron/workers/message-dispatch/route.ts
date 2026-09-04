import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import crypto from 'crypto';
import { dispatchOutboundMessage } from '@/lib/messaging/dispatchOutboundMessage';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Retry worker for the interactive outbound-DM send path (Message Delivery
// Reliability Part 2). Mirrors whatsapp-dispatch / sms-dispatch: CRON_SECRET auth,
// atomic FOR UPDATE SKIP LOCKED batch via acquire_message_jobs, plain per-row
// UPDATEs. The actual send + state transition + dead-letter handling all live in
// the shared dispatchOutboundMessage() helper so this file and sendMessage() use
// exactly one send code path.
export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = `message_worker_${crypto.randomUUID()}`;
  const batchSize = 50;

  try {
    const { data: jobs, error: lockErr } = await supabaseAdmin.rpc('acquire_message_jobs', {
      worker_id: workerId,
      batch_size: batchSize,
    });

    if (lockErr) {
      logger.error({ err: lockErr }, 'cron.message_dispatch.jobs_acquire.failed');
      return NextResponse.json({ error: 'Lock acquisition failed' }, { status: 500 });
    }
    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'Queue is empty' });
    }

    const messageIds = jobs.map((j: any) => j.message_id);
    const conversationIds = [...new Set(jobs.map((j: any) => j.conversation_id))];
    const workspacePlatformKeys = new Set(jobs.map((j: any) => `${j.workspace_id}:${j.platform}`));

    const { data: messages } = await supabaseAdmin
      .from('messages')
      .select('id, workspace_id, conversation_id, content, external_id, metadata, status')
      .in('id', messageIds);

    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('id, external_thread_id, platform')
      .in('id', conversationIds);

    const { data: connections } = await supabaseAdmin
      .from('platform_connections')
      .select('workspace_id, platform, credentials')
      .in('workspace_id', [...new Set(jobs.map((j: any) => j.workspace_id))]);

    const messagesMap = new Map((messages || []).map((m: any) => [m.id, m]));
    const conversationsMap = new Map((conversations || []).map((c: any) => [c.id, c]));
    const connectionsMap = new Map((connections || []).map((c: any) => [`${c.workspace_id}:${c.platform}`, c]));

    let sent = 0;
    let retrying = 0;
    let failed = 0;

    for (const job of jobs) {
      const message: any = messagesMap.get(job.message_id);
      const conversation: any = conversationsMap.get(job.conversation_id);
      const connection: any = connectionsMap.get(`${job.workspace_id}:${job.platform}`);

      // The message may have been delivered / read / failed by a webhook or a
      // manual retry since this row was queued — nothing left to do.
      if (!message || !['queued', 'sending', 'retrying'].includes(message.status)) {
        await supabaseAdmin
          .from('message_dispatch_queue')
          .update({ status: 'done', locked_by: null })
          .eq('id', job.id);
        continue;
      }

      if (!conversation || !connection?.credentials) {
        await supabaseAdmin
          .from('messages')
          .update({
            status: 'failed',
            metadata: { ...(message.metadata || {}), error_message: 'Conversation or platform connection no longer available' },
          })
          .eq('id', message.id);
        await supabaseAdmin
          .from('message_dispatch_queue')
          .update({ status: 'failed', last_error: 'missing conversation/connection', locked_by: null })
          .eq('id', job.id);
        await supabaseAdmin.from('webhook_dead_letters').insert({
          provider: 'message_send',
          payload: { message_id: message.id, conversation_id: job.conversation_id, workspace_id: job.workspace_id, platform: job.platform },
          error: 'Conversation or platform connection no longer available',
          error_type: 'meta_send_permanent_no_connection',
          retry_state: 'unresolved',
        });
        failed++;
        continue;
      }

      const attemptNumber = (job.attempt_count || 1) + 1;
      const outcome = await dispatchOutboundMessage(
        { messagesClient: supabaseAdmin },
        {
          message,
          platform: job.platform,
          recipient: conversation.external_thread_id || '',
          credentials: connection.credentials,
          attemptNumber,
          context: 'worker',
        },
      );

      if (outcome.outcome === 'sent') sent++;
      else if (outcome.outcome === 'retrying') retrying++;
      else failed++;
    }

    // Sweep any rows still 'processing' from this batch (helper always moves them
    // to pending/done/failed, but a mid-run crash could leave one locked).
    await supabaseAdmin
      .from('message_dispatch_queue')
      .update({ status: 'pending', locked_by: null })
      .eq('locked_by', workerId)
      .eq('status', 'processing');

    logger.info({ workerId, processed: jobs.length, sent, retrying, failed }, 'cron.message_dispatch.done');
    return NextResponse.json({ success: true, processed: jobs.length, sent, retrying, failed });
  } catch (error: any) {
    logger.error({ err: error }, 'cron.message_dispatch.failed');
    return NextResponse.json({ error: 'Message dispatch worker failed.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  return GET(req);
}
