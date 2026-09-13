import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  buildWebhookUrl,
  verifySignature,
  formDataToParams,
  getWorkspaceAuthTokenByCallLog,
  getCallLogByCallSid,
  finalizeCallLog,
} from '@/lib/twilio/ivrRouter';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Real Twilio call-status callback — configured as the number's statusCallback when a menu is
// assigned (assignMenuToNumber). Fires once the ENTIRE call ends, regardless of how (caller
// hangup mid-menu, no-answer on a forward, normal completion) — this is the one authoritative
// source for final call_status/duration on every call, including ones that never reach a
// dial-complete/recording callback at all (e.g. hangup while still in the menu).
export async function POST(req: NextRequest) {
  let params: Record<string, string>;
  try {
    params = await formDataToParams(req);
  } catch (err) {
    logger.error({ err }, 'ivr.voice_status.parse_failed');
    return new Response('OK', { status: 200 });
  }

  const callSid = params.CallSid;
  const callStatus = params.CallStatus;
  const duration = params.CallDuration ? parseInt(params.CallDuration, 10) : undefined;

  const callLog = await getCallLogByCallSid(callSid);
  if (!callLog) return new Response('OK', { status: 200 });

  const ctx = await getWorkspaceAuthTokenByCallLog(callLog.id);
  if (!ctx) return new Response('OK', { status: 200 });

  const signature = req.headers.get('X-Twilio-Signature');
  const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice/status');
  if (!verifySignature(ctx.authToken, signature, expectedUrl, params)) {
    logger.warn({ callSid }, 'ivr.voice_status.signature_invalid');
    return new Response('Forbidden', { status: 403 });
  }

  const adminClient = createAdminClient();
  const { data: existing } = await adminClient.from('call_logs').select('outcome').eq('id', callLog.id).single();

  await finalizeCallLog(callLog.id, {
    call_status: callStatus,
    ended_at: new Date().toISOString(),
    ...(duration !== undefined ? { duration_seconds: duration } : {}),
    // A call that ended without any routing action ever setting a specific outcome (e.g. the
    // caller just hung up mid-menu) is a genuine hangup — the only case this backfills.
    ...(!existing?.outcome ? { outcome: 'hangup' } : {}),
  });

  return new Response('OK', { status: 200 });
}
