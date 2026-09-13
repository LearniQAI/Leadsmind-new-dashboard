import { NextRequest } from 'next/server';
import {
  buildWebhookUrl,
  verifySignature,
  formDataToParams,
  getWorkspaceAuthTokenByCallLog,
  finalizeCallLog,
} from '@/lib/twilio/ivrRouter';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Real full-call recording callback — only ever invoked when a menu has record_calls enabled
// (an explicit, clearly-labeled opt-in; see the builder UI). Distinct from the voicemail
// recording callback: no admin notification is sent here, this is just archival of the bridged
// call audio. The call has already ended by the time this fires, so no TwiML response matters.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const callLogId = url.searchParams.get('callLogId') || '';

  let params: Record<string, string>;
  try {
    params = await formDataToParams(req);
  } catch (err) {
    logger.error({ err, callLogId }, 'ivr.call_recording.parse_failed');
    return new Response('OK', { status: 200 });
  }

  if (!callLogId) return new Response('OK', { status: 200 });

  const ctx = await getWorkspaceAuthTokenByCallLog(callLogId);
  if (!ctx) return new Response('OK', { status: 200 });

  const signature = req.headers.get('X-Twilio-Signature');
  const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice/call-recording', { callLogId });
  if (!verifySignature(ctx.authToken, signature, expectedUrl, params)) {
    logger.warn({ callLogId }, 'ivr.call_recording.signature_invalid');
    return new Response('Forbidden', { status: 403 });
  }

  if (params.RecordingUrl) {
    await finalizeCallLog(callLogId, { recording_url: params.RecordingUrl });
  }

  return new Response('OK', { status: 200 });
}
