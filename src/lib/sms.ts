import { logger } from '@/shared/logger';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizePhone, splitChannelPrefix } from '@/lib/phone';
import { getSmsOptOutReason, SmsOptedOutError } from '@/lib/smsOptOut';

export { SmsOptedOutError };

// Opt-out enforcement lives HERE, in the one function every SMS/WhatsApp send in the app funnels
// through (it is the only caller of twilio messages.create), so no call site can forget it.
//  - purpose 'marketing' (the default) is checked against the workspace's opt-outs
//    (sms_suppression_list + contact flags) and throws SmsOptedOutError instead of sending.
//  - purpose 'transactional' (one-time codes, payment receipts, legally-required consent requests,
//    internal staff notifications) is exempt — callers must say so explicitly.
//  - a platform-level send (no `config`) belongs to no workspace and is not checked.
// The workspace is the explicit `workspaceId` when the caller passes it, else the workspace that
// owns `config.fromNumber`. Recipients are also normalised to E.164 here (South African local
// numbers become +27…), replacing the ad-hoc `'+' + phone` every caller used to do.
export type SmsPurpose = 'marketing' | 'transactional';

// Two distinct calling conventions, not one:
//
// 1. Workspace-scoped send: caller passes `config` (even if its fields are
//    undefined — e.g. `{ ...resolveWorkspaceTwilioCredentials(workspace) }`
//    for a workspace with no Twilio account connected). This is every
//    CRM/automation/LMS/reputation/support/KYC call site. These must NOT
//    fall back to a global Twilio account: confirmed live (2026-09-17) that
//    doing so silently routed a workspace with no Twilio config through a
//    platform-wide TWILIO_ACCOUNT_SID/AUTH_TOKEN env var instead of failing
//    — the platform account backing that env var turned out to be an
//    unrelated personal Twilio trial account ("My First Twilio Account"),
//    confirmed via Twilio's own Usage/Records API to have zero real sends
//    ever, so nothing shipped, but the substitution itself was never
//    intended and is closed here: an unconfigured workspace now throws
//    instead of silently "succeeding" with a mock ID or a real send through
//    someone else's account.
//
// 2. Platform-level send: caller omits `config` entirely — currently only
//    the inbound-email-to-SMS bridge (api/webhooks/resend/inbound) and the
//    client-portal OTP/magic-link routes (api/auth/portal/otp,
//    api/auth/portal/magic-link), none of which are workspace-scoped
//    actions to begin with. This is the one case the env vars below are
//    still used for, unchanged from before.
async function workspacesOwningNumber(fromNumber: string | null | undefined): Promise<string[]> {
 const { number } = splitChannelPrefix(fromNumber ?? '');
 const e164 = normalizePhone(number);
 if (!e164) return [];
 const { data, error } = await createAdminClient().from('workspaces').select('id').eq('twilio_number', e164);
 if (error) throw new Error(`Could not resolve the sending workspace: ${error.message}`);
 return (data ?? []).map((w: any) => w.id);
}

export async function sendSMS({ to: rawTo, message, mediaUrl, config, workspaceId, purpose = 'marketing' }: { to: string, message: string, mediaUrl?: string, config?: { accountSid?: string | null, authToken?: string | null, fromNumber?: string | null }, workspaceId?: string, purpose?: SmsPurpose }) {
 const isPlatformLevelSend = config === undefined;

 const { prefix, number } = splitChannelPrefix(rawTo);
 const e164 = normalizePhone(number);
 const to = e164 ? `${prefix}${e164}` : rawTo;

 if (!isPlatformLevelSend && purpose !== 'transactional' && e164) {
  const workspaceIds = workspaceId ? [workspaceId] : await workspacesOwningNumber(config?.fromNumber);
  if (workspaceIds.length === 0) {
   logger.warn({ fromNumber: config?.fromNumber }, 'sms.optout_check.workspace_unresolved');
  }
  const admin = createAdminClient();
  for (const wsId of workspaceIds) {
   const reason = await getSmsOptOutReason(admin, wsId, e164); // throws on lookup failure: fail closed
   if (reason) {
    logger.info({ workspaceId: wsId, reason }, 'sms.blocked_opted_out');
    throw new SmsOptedOutError(reason);
   }
  }
 }

 const accountSid = isPlatformLevelSend ? process.env.TWILIO_ACCOUNT_SID : config?.accountSid;
 const authToken = isPlatformLevelSend ? process.env.TWILIO_AUTH_TOKEN : config?.authToken;
 const apiKey = process.env.TWILIO_API_KEY;
 const apiSecret = process.env.TWILIO_API_SECRET;
 const fromNumber = isPlatformLevelSend ? process.env.TWILIO_PHONE_NUMBER : config?.fromNumber;

 // Explicit, opt-in local-dev mock — set TWILIO_ACCOUNT_SID=AC_123 (platform
 // sends) or pass config.accountSid: 'AC_123' (workspace sends) to exercise
 // SMS/WhatsApp-touching features locally with no real Twilio account at
 // all. This never happens implicitly.
 if (accountSid === 'AC_123') {
  logger.info({ to, message, mediaUrl }, 'sms.dev_mock_mode');
  return { sid: 'mock_sms_id_' + Date.now() };
 }

 if (!accountSid || (!authToken && !apiKey) || !fromNumber) {
  throw new Error(
   isPlatformLevelSend
    ? 'Twilio is not configured at the platform level (TWILIO_ACCOUNT_SID/AUTH_TOKEN/PHONE_NUMBER env vars missing).'
    : 'Twilio is not configured for this workspace — connect a Twilio account before sending SMS/WhatsApp messages.'
  );
 }

 const twilio = require('twilio');
 let client;
 if (apiKey && apiSecret) {
   client = twilio(apiKey, apiSecret, { accountSid });
 } else {
   client = twilio(accountSid, authToken);
 }

 try {
  const options: any = { body: message, from: fromNumber, to };
  if (mediaUrl) {
    options.mediaUrl = [mediaUrl];
  }
  const result = await client.messages.create(options);
  return { sid: result.sid };
 } catch (error) {
  logger.error({ err: error }, 'sms.twilio.failed');
  throw error;
 }
}
