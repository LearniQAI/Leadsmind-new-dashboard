import { NextRequest } from 'next/server';
import {
  buildWebhookUrl,
  verifySignature,
  formDataToParams,
  xmlResponse,
  renderRingGroupTwiml,
  getWorkspaceAuthTokenByCallLog,
  finalizeCallLog,
} from '@/lib/twilio/ivrRouter';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Real sequential ring-group continuation. Twilio can't natively "try these numbers one at a
// time" — that's implemented here by chaining single-<Number> <Dial> verbs, deciding after each
// unanswered attempt whether to try the next number in the list or give up.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const callLogId = url.searchParams.get('callLogId') || '';
  const index = parseInt(url.searchParams.get('index') || '0', 10);
  const numbersParam = url.searchParams.get('numbers') || '';
  const recordParam = url.searchParams.get('record') || '0';
  const recordCalls = recordParam === '1';

  let numbers: string[] = [];
  try {
    numbers = JSON.parse(decodeURIComponent(numbersParam));
  } catch {
    numbers = [];
  }

  let params: Record<string, string>;
  try {
    params = await formDataToParams(req);
  } catch (err) {
    logger.error({ err, callLogId }, 'ivr.ring_group.parse_failed');
    return xmlResponse('<Hangup/>');
  }

  if (!callLogId || numbers.length === 0) return xmlResponse('<Hangup/>');

  const ctx = await getWorkspaceAuthTokenByCallLog(callLogId);
  if (!ctx) return xmlResponse('<Hangup/>');

  const signature = req.headers.get('X-Twilio-Signature');
  const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice/ring-group', { callLogId, index: String(index), numbers: numbersParam, record: recordParam });
  if (!verifySignature(ctx.authToken, signature, expectedUrl, params)) {
    logger.warn({ callLogId }, 'ivr.ring_group.signature_invalid');
    return new Response('Forbidden', { status: 403 });
  }

  const dialStatus = params.DialCallStatus;
  if (dialStatus === 'completed') {
    await finalizeCallLog(callLogId, { outcome: 'forwarded' });
    return xmlResponse('');
  }

  const nextIndex = index + 1;
  if (nextIndex < numbers.length) {
    return xmlResponse(renderRingGroupTwiml({ strategy: 'sequential', numbers }, callLogId, nextIndex, recordCalls));
  }

  await finalizeCallLog(callLogId, { outcome: 'ring_group_no_answer' });
  return xmlResponse('<Say>Sorry, no one was available to take your call. Goodbye.</Say><Hangup/>');
}
