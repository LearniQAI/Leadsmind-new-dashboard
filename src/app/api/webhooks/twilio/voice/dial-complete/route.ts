import { NextRequest } from 'next/server';
import {
  buildWebhookUrl,
  verifySignature,
  formDataToParams,
  xmlResponse,
  getWorkspaceAuthTokenByCallLog,
  finalizeCallLog,
} from '@/lib/twilio/ivrRouter';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Real <Dial> action callback for a plain forward or a simultaneous ring group. Fires once the
// dial attempt finishes (answered-and-ended, no-answer, busy, or failed) — the true outcome, as
// opposed to the routing hit that only knows a forward/ring group WAS selected.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const callLogId = url.searchParams.get('callLogId') || '';
  const requestedOutcome = url.searchParams.get('outcome') || 'forwarded';

  let params: Record<string, string>;
  try {
    params = await formDataToParams(req);
  } catch (err) {
    logger.error({ err, callLogId }, 'ivr.dial_complete.parse_failed');
    return xmlResponse('<Hangup/>');
  }

  if (!callLogId) return xmlResponse('<Hangup/>');

  const ctx = await getWorkspaceAuthTokenByCallLog(callLogId);
  if (!ctx) return xmlResponse('<Hangup/>');

  const signature = req.headers.get('X-Twilio-Signature');
  const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice/dial-complete', { callLogId, outcome: requestedOutcome });
  if (!verifySignature(ctx.authToken, signature, expectedUrl, params)) {
    logger.warn({ callLogId }, 'ivr.dial_complete.signature_invalid');
    return new Response('Forbidden', { status: 403 });
  }

  // DialCallStatus: completed | busy | no-answer | failed | canceled
  const dialStatus = params.DialCallStatus;
  const answered = dialStatus === 'completed';

  await finalizeCallLog(callLogId, {
    outcome: answered ? requestedOutcome : 'ring_group_no_answer',
  });

  // If the call was answered, Twilio has already hung up both legs by the time this callback
  // fires (that's what triggers it) — this response only matters for the no-answer/busy/failed
  // case, where the caller is still on the line and needs a real closing message.
  if (answered) return xmlResponse('');
  return xmlResponse('<Say>Sorry, no one was available to take your call. Goodbye.</Say><Hangup/>');
}
