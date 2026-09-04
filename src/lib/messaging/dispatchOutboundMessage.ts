/**
 * The single outbound-send code path for Instagram / Messenger / WhatsApp DMs
 * (Message Delivery Reliability Part 2).
 *
 * Used by BOTH:
 *   - sendMessage() in src/app/actions/messaging.ts — the inline first attempt
 *     the agent triggers (attemptNumber = 1, context = 'inline').
 *   - /api/cron/workers/message-dispatch — the retry worker (attemptNumber >= 2,
 *     context = 'worker').
 *
 * It performs exactly one provider send (with an AbortController timeout), then
 * applies the resulting state transition:
 *   success            -> messages.status = 'sent' (+ external_id), queue row done
 *   recoverable failure -> messages.status = 'retrying', queue row scheduled for the
 *                          next backoff step (unless attempts are exhausted)
 *   permanent failure   -> messages.status = 'failed' (+ real Graph error), a
 *                          webhook_dead_letters row, NO retries burned
 *   retries exhausted   -> same as permanent, error_type 'meta_send_retries_exhausted'
 *
 * `messages` writes go through the caller's supabase client (RLS-checked for the
 * inline path, admin for the worker). Queue + dead-letter writes always go through
 * the admin client — those tables are admin-only, same as whatsapp_dispatch_queue.
 */

import { createAdminClient } from '@/lib/supabase/server';
import { MetaAdapter, type MetaSendResult } from '@/lib/meta/MetaAdapter';
import { classifySendFailure } from '@/lib/meta/sendFailureClass';
import { MESSAGE_SEND_MAX_ATTEMPTS, MESSAGE_SEND_TIMEOUT_MS, nextAttemptAt } from './retryConfig';
import { logger } from '@/shared/logger';

export interface DispatchMessageRow {
  id: string;
  workspace_id: string;
  conversation_id: string;
  content: string;
  external_id: string | null;
  metadata: Record<string, any> | null;
  status?: string;
}

export interface DispatchParams {
  message: DispatchMessageRow;
  platform: string; // 'facebook' | 'instagram' | 'whatsapp'
  recipient: string; // conversation.external_thread_id
  credentials: any; // platform_connections.credentials
  attemptNumber: number; // the attempt being made right now (inline = 1)
  context: 'inline' | 'worker';
}

export type DispatchResult =
  | { outcome: 'sent'; externalId?: string }
  | { outcome: 'retrying'; nextAttemptAt: string; error: string }
  | { outcome: 'failed'; error: string; failureClass: 'permanent' | 'exhausted' };

const NON_TERMINAL = ['queued', 'sending', 'retrying'];

function cleanMeta(base: Record<string, any> | null | undefined): Record<string, any> {
  const { error_message, error_code, error_subcode, error_type, fbtrace_id, http_status, last_failure_class, ...rest } =
    (base || {}) as Record<string, any>;
  return rest;
}

function mergeFailureMeta(base: Record<string, any> | null | undefined, res: MetaSendResult, attemptNumber: number, failureClass: string) {
  const merged: Record<string, any> = {
    ...cleanMeta(base),
    error_message: res.error || 'Send failed',
    last_failure_class: failureClass,
    attempts: attemptNumber,
  };
  if (res.errorCode !== undefined) merged.error_code = res.errorCode;
  if (res.errorSubcode !== undefined) merged.error_subcode = res.errorSubcode;
  if (res.errorType !== undefined) merged.error_type = res.errorType;
  if (res.fbtraceId !== undefined) merged.fbtrace_id = res.fbtraceId;
  if (res.httpStatus !== undefined) merged.http_status = res.httpStatus;
  return merged;
}

export async function dispatchOutboundMessage(
  deps: { messagesClient: any },
  params: DispatchParams,
): Promise<DispatchResult> {
  const { messagesClient } = deps;
  const { message, platform, recipient, credentials, attemptNumber, context } = params;
  const admin = createAdminClient();

  const markQueue = (fields: Record<string, any>) =>
    admin.from('message_dispatch_queue').update({ ...fields, locked_by: null }).eq('message_id', message.id);

  // --- Idempotency: a prior attempt already reached the provider ---------------
  // We hold no idempotency key Meta honours, so if external_id is already set the
  // previous attempt DID send (we just missed the ack). Never send again.
  if (message.external_id) {
    await messagesClient.from('messages').update({ status: 'sent' }).eq('id', message.id).in('status', NON_TERMINAL);
    await admin
      .from('message_dispatch_queue')
      .update({ status: 'done', locked_by: null })
      .eq('message_id', message.id)
      .in('status', ['pending', 'processing']);
    logger.info({ messageId: message.id, attemptNumber }, 'messaging.dispatch.already_sent_skip');
    return { outcome: 'sent', externalId: message.external_id };
  }

  // --- One provider send -----------------------------------------------------
  let res: MetaSendResult;
  if (platform === 'facebook' || platform === 'instagram' || platform === 'whatsapp') {
    const adapter = new MetaAdapter(credentials, { timeoutMs: MESSAGE_SEND_TIMEOUT_MS });
    if (platform === 'facebook') res = await adapter.sendFacebook(recipient, message.content);
    else if (platform === 'instagram') res = await adapter.sendInstagram(recipient, message.content);
    else res = await adapter.sendWhatsApp(recipient, message.content);
  } else {
    res = { success: false, error: `Unsupported platform for retry queue: ${platform}`, errorType: 'unsupported_platform' };
  }

  // --- Success -------------------------------------------------------------
  if (res.success) {
    await messagesClient
      .from('messages')
      .update({ status: 'sent', external_id: res.externalId })
      .eq('id', message.id)
      .in('status', NON_TERMINAL);
    await markQueue({ status: 'done' });
    logger.info({ messageId: message.id, platform, attemptNumber, context }, 'messaging.dispatch.sent');
    return { outcome: 'sent', externalId: res.externalId };
  }

  // --- Failure: classify -------------------------------------------------------
  const failureClass = platform === 'facebook' || platform === 'instagram' || platform === 'whatsapp'
    ? classifySendFailure(res)
    : 'permanent';
  const exhausted = attemptNumber >= MESSAGE_SEND_MAX_ATTEMPTS;
  const meta = mergeFailureMeta(message.metadata, res, attemptNumber, failureClass);

  logger.error(
    { messageId: message.id, platform, attemptNumber, context, failureClass, exhausted, code: res.errorCode, errType: res.errorType, err: res.error },
    'messaging.dispatch.failed',
  );

  // --- Permanent, or retries exhausted -> FAILED + dead letter ---------------
  if (failureClass === 'permanent' || exhausted) {
    await messagesClient
      .from('messages')
      .update({ status: 'failed', metadata: meta })
      .eq('id', message.id)
      .in('status', NON_TERMINAL); // never overwrite a delivered/read message
    await markQueue({ status: 'failed', last_error: res.error || null, last_error_code: res.errorCode ?? null, failure_class: failureClass });

    const { error: dlErr } = await admin.from('webhook_dead_letters').insert({
      provider: 'message_send',
      payload: {
        message_id: message.id,
        conversation_id: message.conversation_id,
        workspace_id: message.workspace_id,
        platform,
        client_message_uuid: message.metadata?.client_message_uuid ?? null,
        attempts: attemptNumber,
        graph_error: { code: res.errorCode, subcode: res.errorSubcode, type: res.errorType, fbtrace_id: res.fbtraceId, http_status: res.httpStatus },
      },
      error: res.error || 'Outbound message send failed',
      error_type: failureClass === 'permanent'
        ? `meta_send_permanent${res.errorCode ? `_${res.errorCode}` : ''}`
        : 'meta_send_retries_exhausted',
      retry_state: 'unresolved',
    });
    if (dlErr) logger.error({ err: dlErr, messageId: message.id }, 'messaging.dispatch.dead_letter_insert_failed');

    return { outcome: 'failed', error: res.error || 'Send failed', failureClass: failureClass === 'permanent' ? 'permanent' : 'exhausted' };
  }

  // --- Recoverable, attempts remain -> RETRYING + (re)schedule --------------
  const scheduledFor = nextAttemptAt(attemptNumber);
  await messagesClient
    .from('messages')
    .update({ status: 'retrying', metadata: meta })
    .eq('id', message.id)
    .in('status', NON_TERMINAL);

  const queueRow = {
    message_id: message.id,
    workspace_id: message.workspace_id,
    conversation_id: message.conversation_id,
    platform,
    status: 'pending',
    attempt_count: attemptNumber,
    max_attempts: MESSAGE_SEND_MAX_ATTEMPTS,
    next_attempt_at: scheduledFor,
    last_error: res.error || null,
    last_error_code: res.errorCode ?? null,
    failure_class: 'recoverable',
    locked_by: null,
  };

  if (context === 'inline') {
    // First failure — create the retry track (or revive a stale one for a
    // message row that was reused by Part 1's failed-row retry).
    const { error: upErr } = await admin.from('message_dispatch_queue').upsert(queueRow, { onConflict: 'message_id' });
    if (upErr) logger.error({ err: upErr, messageId: message.id }, 'messaging.dispatch.enqueue_failed');
  } else {
    const { error: upErr } = await admin
      .from('message_dispatch_queue')
      .update({
        status: 'pending',
        attempt_count: attemptNumber,
        next_attempt_at: scheduledFor,
        last_error: res.error || null,
        last_error_code: res.errorCode ?? null,
        failure_class: 'recoverable',
        locked_by: null,
      })
      .eq('message_id', message.id);
    if (upErr) logger.error({ err: upErr, messageId: message.id }, 'messaging.dispatch.reschedule_failed');
  }

  return { outcome: 'retrying', nextAttemptAt: scheduledFor, error: res.error || 'Send failed' };
}
