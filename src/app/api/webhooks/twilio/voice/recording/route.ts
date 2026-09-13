import { NextRequest } from 'next/server';
import {
  buildWebhookUrl,
  verifySignature,
  formDataToParams,
  xmlResponse,
  getWorkspaceAuthTokenByCallLog,
  finalizeCallLog,
  notifyVoicemailLeft,
} from '@/lib/twilio/ivrRouter';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Real Twilio <Record> completion callback (voicemail). Fires once the caller finishes leaving
// a message (hangup, silence timeout, max length, or the # finish key).
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const callLogId = url.searchParams.get('callLogId') || '';

  let params: Record<string, string>;
  try {
    params = await formDataToParams(req);
  } catch (err) {
    logger.error({ err, callLogId }, 'ivr.voice_recording.parse_failed');
    return xmlResponse('<Hangup/>');
  }

  if (!callLogId) {
    // Defensive only — every real voicemail is rendered with a real callLogId in the action URL.
    logger.warn({}, 'ivr.voice_recording.missing_call_log_id');
    return xmlResponse('<Say>Thank you. Goodbye.</Say><Hangup/>');
  }

  const ctx = await getWorkspaceAuthTokenByCallLog(callLogId);
  if (!ctx) return xmlResponse('<Say>Thank you. Goodbye.</Say><Hangup/>');

  const signature = req.headers.get('X-Twilio-Signature');
  const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice/recording', { callLogId });
  if (!verifySignature(ctx.authToken, signature, expectedUrl, params)) {
    logger.warn({ callLogId }, 'ivr.voice_recording.signature_invalid');
    return new Response('Forbidden', { status: 403 });
  }

  const recordingUrl = params.RecordingUrl;
  const duration = params.RecordingDuration ? parseInt(params.RecordingDuration, 10) : undefined;

  if (recordingUrl) {
    await finalizeCallLog(callLogId, {
      outcome: 'voicemail',
      voicemail_url: recordingUrl,
      ...(duration !== undefined ? { voicemail_duration_seconds: duration } : {}),
    });
    await notifyVoicemailLeft(ctx.workspaceId, callLogId, params.From || 'unknown number');
  } else {
    await finalizeCallLog(callLogId, { outcome: 'voicemail_empty' });
  }

  return xmlResponse('<Say>Thank you, your message has been recorded. Goodbye.</Say><Hangup/>');
}
