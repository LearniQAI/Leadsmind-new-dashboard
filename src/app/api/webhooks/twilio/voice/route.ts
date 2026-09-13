import { NextRequest } from 'next/server';
import {
  buildWebhookUrl,
  verifySignature,
  formDataToParams,
  xmlResponse,
  getWorkspaceAuthTokenByNumber,
  getWorkspaceAuthTokenByMenu,
  fetchMenuWithOptions,
  renderMenuGatherTwiml,
  renderFallbackTwiml,
  renderVoicemailTwiml,
  renderForwardTwiml,
  renderRingGroupTwiml,
  createInitialCallLog,
  getCallLogByCallSid,
  appendMenuPath,
  finalizeCallLog,
} from '@/lib/twilio/ivrRouter';
import { logger } from '@/shared/logger';

export const runtime = 'nodejs';

// Real Twilio Voice webhook — the single endpoint every provisioned number's Voice URL points
// at (set by assignMenuToNumber in src/app/actions/ivr.ts). Called twice per menu level: once
// with no menuId (the initial inbound call) and then repeatedly with ?menuId=&attempt= as the
// caller navigates the menu tree, since Twilio's <Gather>/<Redirect> model is itself stateless —
// all state (which menu, which retry attempt) travels in the action/redirect URL, not in memory.
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const menuIdParam = url.searchParams.get('menuId');
  const attemptParam = parseInt(url.searchParams.get('attempt') || '0', 10);

  let params: Record<string, string>;
  try {
    params = await formDataToParams(req);
  } catch (err) {
    logger.error({ err }, 'ivr.voice.parse_failed');
    return xmlResponse('<Say>Sorry, a system error occurred. Goodbye.</Say><Hangup/>');
  }

  const callSid = params.CallSid;
  const from = params.From;
  const to = params.To;
  const digits = params.Digits;

  try {
    // ── Initial inbound call ────────────────────────────────────────────
    if (!menuIdParam) {
      const ctx = await getWorkspaceAuthTokenByNumber(to);
      if (!ctx) {
        logger.warn({ to }, 'ivr.voice.number_not_found');
        return xmlResponse('<Say>This number is not in service.</Say><Hangup/>');
      }

      const signature = req.headers.get('X-Twilio-Signature');
      const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice');
      if (!verifySignature(ctx.authToken, signature, expectedUrl, params)) {
        logger.warn({ to }, 'ivr.voice.signature_invalid');
        return new Response('Forbidden', { status: 403 });
      }

      const callLogId = await createInitialCallLog({ workspaceId: ctx.workspaceId, phoneNumberId: ctx.phoneNumberId, callSid, from, to });

      if (!ctx.activeMenuId) {
        if (callLogId) await finalizeCallLog(callLogId, { outcome: 'no_menu_configured' });
        return xmlResponse('<Say>This number is not configured for call handling yet. Goodbye.</Say><Hangup/>');
      }

      const menuData = await fetchMenuWithOptions(ctx.activeMenuId);
      if (!menuData) {
        if (callLogId) await finalizeCallLog(callLogId, { outcome: 'no_menu_configured' });
        return xmlResponse('<Say>This number is not configured for call handling yet. Goodbye.</Say><Hangup/>');
      }

      return xmlResponse(renderMenuGatherTwiml(menuData.menu, 0));
    }

    // ── Routing hit: a digit was gathered, or a no-input timeout fell through ───────────────
    const menuCtx = await getWorkspaceAuthTokenByMenu(menuIdParam);
    if (!menuCtx) return xmlResponse('<Say>Sorry, an error occurred. Goodbye.</Say><Hangup/>');

    const signature = req.headers.get('X-Twilio-Signature');
    const expectedUrl = buildWebhookUrl('/api/webhooks/twilio/voice', { menuId: menuIdParam, attempt: String(attemptParam) });
    if (!verifySignature(menuCtx.authToken, signature, expectedUrl, params)) {
      logger.warn({ menuIdParam }, 'ivr.voice.signature_invalid');
      return new Response('Forbidden', { status: 403 });
    }

    const callLog = await getCallLogByCallSid(callSid);
    const menuData = await fetchMenuWithOptions(menuIdParam);
    if (!menuData) return xmlResponse('<Say>Sorry, an error occurred. Goodbye.</Say><Hangup/>');
    const { menu, options } = menuData;

    if (digits) {
      const option = options.find((o) => o.keypress === digits);
      if (option) {
        if (callLog) await appendMenuPath(callLog.id, { menuId: menu.id, menuName: menu.name, keypress: digits });

        if (option.destination_type === 'submenu') {
          const submenuData = await fetchMenuWithOptions(option.destination_value?.menuId);
          if (!submenuData) return xmlResponse('<Say>Sorry, an error occurred. Goodbye.</Say><Hangup/>');
          return xmlResponse(renderMenuGatherTwiml(submenuData.menu, 0));
        }

        if (option.destination_type === 'forward') {
          return xmlResponse(renderForwardTwiml(option.destination_value.number, callLog?.id || '', menu.record_calls));
        }

        if (option.destination_type === 'ring_group') {
          return xmlResponse(renderRingGroupTwiml(option.destination_value, callLog?.id || '', 0, menu.record_calls));
        }

        if (option.destination_type === 'voicemail') {
          return xmlResponse(renderVoicemailTwiml(callLog?.id || ''));
        }
      }
    }

    // Invalid digit, or no input at all (this hit came from the Gather's sibling <Redirect>).
    if (attemptParam >= menu.retry_limit) {
      if (callLog) {
        await finalizeCallLog(callLog.id, {
          outcome: menu.fallback_destination_type === 'hangup' ? 'max_retries_exceeded' : undefined,
        });
      }
      return xmlResponse(renderFallbackTwiml(menu, callLog?.id || ''));
    }

    const prompt = digits ? "Sorry, that's not a valid option." : "We didn't receive any input.";
    return xmlResponse(renderMenuGatherTwiml(menu, attemptParam + 1, prompt));
  } catch (err: any) {
    logger.error({ err, callSid }, 'ivr.voice_webhook.failed');
    return xmlResponse('<Say>Sorry, a system error occurred. Goodbye.</Say><Hangup/>');
  }
}
