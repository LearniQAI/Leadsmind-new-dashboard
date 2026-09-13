// Telephony Phase 3 — shared TwiML-building and call-log helpers for the real Twilio voice
// webhooks under src/app/api/webhooks/twilio/voice/*. Kept out of the route files themselves
// so the main route, the status callback, the recording callback, and the ring-group
// continuation route can all build correct, escaped TwiML and touch call_logs the same way.

import { validateRequest } from 'twilio';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveWorkspaceTwilioCredentials } from '@/lib/twilio/resolveWorkspaceTwilioCredentials';
import { sendEmail } from '@/lib/email';
import { logger } from '@/shared/logger';

export function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error('[FATAL] NEXT_PUBLIC_APP_URL env var is not configured');
  return url.replace(/\/$/, '');
}

// Twilio's signature covers the exact URL it was given, including query string, in the order
// Twilio was told to call it — NOT necessarily what a proxied req.url reports. Built the same
// way the existing SMS inbound webhook does it (src/app/api/webhooks/twilio/inbound/route.ts).
export function buildWebhookUrl(pathname: string, params?: Record<string, string>): string {
  const url = new URL(`${appUrl()}${pathname}`);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return url.toString();
}

export function escapeXml(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function xmlResponse(body: string, status = 200) {
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`, {
    status,
    headers: { 'Content-Type': 'text/xml' },
  });
}

// Looks up which workspace owns a called Twilio number, and that workspace's real decrypted
// Twilio auth token — needed BEFORE we can validate the request's signature (a workspace's own
// BYO Twilio account has its own auth token, distinct from the platform TWILIO_AUTH_TOKEN the
// existing SMS inbound webhook uses).
export async function getWorkspaceAuthTokenByNumber(toNumber: string): Promise<{ workspaceId: string; authToken: string; phoneNumberId: string; activeMenuId: string | null } | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('workspace_phone_numbers')
    .select('id, workspace_id, active_ivr_menu_id, workspaces!inner(twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted)')
    .eq('phone_number', toNumber)
    .eq('status', 'active')
    .single();

  if (!data) return null;
  const { authToken } = resolveWorkspaceTwilioCredentials((data as any).workspaces);
  if (!authToken) return null;

  return { workspaceId: data.workspace_id, authToken, phoneNumberId: data.id, activeMenuId: data.active_ivr_menu_id };
}

export async function getWorkspaceAuthTokenByMenu(menuId: string): Promise<{ workspaceId: string; authToken: string } | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('ivr_menus')
    .select('workspace_id, workspaces!inner(twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted)')
    .eq('id', menuId)
    .single();

  if (!data) return null;
  const { authToken } = resolveWorkspaceTwilioCredentials((data as any).workspaces);
  if (!authToken) return null;
  return { workspaceId: data.workspace_id, authToken };
}

export async function getWorkspaceAuthTokenByCallLog(callLogId: string): Promise<{ workspaceId: string; authToken: string } | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient
    .from('call_logs')
    .select('workspace_id, workspaces!inner(twilio_sid, twilio_token, twilio_sid_encrypted, twilio_token_encrypted)')
    .eq('id', callLogId)
    .single();

  if (!data) return null;
  const { authToken } = resolveWorkspaceTwilioCredentials((data as any).workspaces);
  if (!authToken) return null;
  return { workspaceId: data.workspace_id, authToken };
}

export function verifySignature(authToken: string, signatureHeader: string | null, url: string, params: Record<string, any>): boolean {
  if (!signatureHeader) return false;
  try {
    return validateRequest(authToken, signatureHeader, url, params);
  } catch (err) {
    logger.warn({ err }, 'ivr.voice_webhook.signature_validation_error');
    return false;
  }
}

export async function formDataToParams(req: Request): Promise<Record<string, string>> {
  const formData = await req.formData();
  const params: Record<string, string> = {};
  formData.forEach((value, key) => { params[key] = String(value); });
  return params;
}

export interface MenuRow {
  id: string;
  name: string;
  greeting_text: string;
  retry_limit: number;
  fallback_destination_type: 'hangup' | 'voicemail' | 'forward';
  fallback_destination_value: any;
  record_calls: boolean;
}

export interface MenuOptionRow {
  id: string;
  keypress: string;
  destination_type: 'submenu' | 'forward' | 'voicemail' | 'ring_group';
  destination_value: any;
}

export async function fetchMenuWithOptions(menuId: string): Promise<{ menu: MenuRow; options: MenuOptionRow[] } | null> {
  const adminClient = createAdminClient();
  const { data: menu } = await adminClient
    .from('ivr_menus')
    .select('id, name, greeting_text, retry_limit, fallback_destination_type, fallback_destination_value, record_calls')
    .eq('id', menuId)
    .single();
  if (!menu) return null;

  const { data: options } = await adminClient
    .from('ivr_menu_options')
    .select('id, keypress, destination_type, destination_value')
    .eq('menu_id', menuId);

  return { menu, options: options || [] };
}

// Renders the <Gather> for a menu at a given retry attempt. Twilio only calls `action` when
// digits ARE gathered — a no-input timeout falls through to the sibling <Redirect> instead,
// which is why every gather block here is followed by one.
export function renderMenuGatherTwiml(menu: MenuRow, attempt: number, promptPrefix?: string): string {
  const actionUrl = buildWebhookUrl('/api/webhooks/twilio/voice', { menuId: menu.id, attempt: String(attempt) });
  const redirectUrl = buildWebhookUrl('/api/webhooks/twilio/voice', { menuId: menu.id, attempt: String(attempt + 1) });
  const prefix = promptPrefix ? `<Say>${escapeXml(promptPrefix)}</Say>` : '';

  return (
    `<Gather numDigits="1" timeout="6" action="${actionUrl}" method="POST">` +
    `${prefix}<Say>${escapeXml(menu.greeting_text)}</Say>` +
    `</Gather>` +
    `<Redirect method="POST">${redirectUrl}</Redirect>`
  );
}

// Full-call recording (menu.record_calls) is a distinct, explicit opt-in from voicemail
// recording — attaches Twilio's own <Dial> recording attributes so the BRIDGED leg gets
// recorded, with its own recordingStatusCallback (never the voicemail notification path).
function recordingDialAttrs(callLogId: string, recordCalls: boolean): string {
  if (!recordCalls) return '';
  const callback = buildWebhookUrl('/api/webhooks/twilio/voice/call-recording', { callLogId });
  return ` record="record-from-answer-dual" recordingStatusCallback="${callback}" recordingStatusCallbackMethod="POST" recordingStatusCallbackEvent="completed"`;
}

export function renderFallbackTwiml(menu: MenuRow, callLogId: string): string {
  if (menu.fallback_destination_type === 'forward') {
    const number = escapeXml(menu.fallback_destination_value?.number || '');
    const dialAction = buildWebhookUrl('/api/webhooks/twilio/voice/dial-complete', { callLogId, outcome: 'forwarded' });
    return `<Say>Connecting your call.</Say><Dial action="${dialAction}" method="POST"${recordingDialAttrs(callLogId, menu.record_calls)}>${number}</Dial>`;
  }
  if (menu.fallback_destination_type === 'voicemail') {
    return renderVoicemailTwiml(callLogId);
  }
  return `<Say>Sorry, we could not process your request. Goodbye.</Say><Hangup/>`;
}

export function renderVoicemailTwiml(callLogId: string): string {
  const action = buildWebhookUrl('/api/webhooks/twilio/voice/recording', { callLogId });
  return (
    `<Say>Please leave your message after the tone. Press the pound key when finished.</Say>` +
    `<Record action="${action}" method="POST" maxLength="120" playBeep="true" trim="trim-silence" finishOnKey="#" />` +
    `<Say>We did not receive a recording. Goodbye.</Say><Hangup/>`
  );
}

export function renderForwardTwiml(number: string, callLogId: string, recordCalls = false): string {
  const dialAction = buildWebhookUrl('/api/webhooks/twilio/voice/dial-complete', { callLogId, outcome: 'forwarded' });
  return `<Say>Connecting your call.</Say><Dial action="${dialAction}" method="POST"${recordingDialAttrs(callLogId, recordCalls)}>${escapeXml(number)}</Dial>`;
}

export function renderRingGroupTwiml(destinationValue: { strategy: 'simultaneous' | 'sequential'; numbers: string[] }, callLogId: string, startIndex = 0, recordCalls = false): string {
  const { strategy, numbers } = destinationValue;
  if (strategy === 'simultaneous') {
    const dialAction = buildWebhookUrl('/api/webhooks/twilio/voice/dial-complete', { callLogId, outcome: 'forwarded' });
    const numberTags = numbers.map((n) => `<Number>${escapeXml(n)}</Number>`).join('');
    return `<Say>Connecting your call.</Say><Dial action="${dialAction}" method="POST" timeout="20"${recordingDialAttrs(callLogId, recordCalls)}>${numberTags}</Dial>`;
  }
  // Sequential: dial one number at a time; the ring-group continuation route decides whether to
  // try the next number or fall through, based on this leg's DialCallStatus.
  const nextAction = buildWebhookUrl('/api/webhooks/twilio/voice/ring-group', {
    callLogId,
    index: String(startIndex),
    numbers: encodeURIComponent(JSON.stringify(numbers)),
    record: recordCalls ? '1' : '0',
  });
  return `<Say>Connecting your call.</Say><Dial action="${nextAction}" method="POST" timeout="20"${recordingDialAttrs(callLogId, recordCalls)}><Number>${escapeXml(numbers[startIndex])}</Number></Dial>`;
}

// ── call_logs lifecycle ──────────────────────────────────────────────────

export async function createInitialCallLog(input: {
  workspaceId: string;
  phoneNumberId: string;
  callSid: string;
  from: string;
  to: string;
}): Promise<string | null> {
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('call_logs')
    .upsert(
      {
        workspace_id: input.workspaceId,
        phone_number_id: input.phoneNumberId,
        twilio_call_sid: input.callSid,
        from_number: input.from,
        to_number: input.to,
        call_status: 'in-progress',
        menu_path: [],
      },
      { onConflict: 'twilio_call_sid', ignoreDuplicates: true }
    )
    .select('id')
    .single();

  if (error) {
    // A retried initial webhook hit for the same CallSid is expected (Twilio retries on non-2xx
    // or timeout) — look the row up instead of treating this as a hard failure.
    const { data: existing } = await adminClient.from('call_logs').select('id').eq('twilio_call_sid', input.callSid).single();
    if (existing) return existing.id;
    logger.error({ err: error, callSid: input.callSid }, 'ivr.call_log.create_failed');
    return null;
  }
  return data.id;
}

export async function getCallLogByCallSid(callSid: string): Promise<{ id: string; menu_path: any[] } | null> {
  const adminClient = createAdminClient();
  const { data } = await adminClient.from('call_logs').select('id, menu_path').eq('twilio_call_sid', callSid).single();
  return data as any;
}

export async function appendMenuPath(callLogId: string, entry: { menuId: string; menuName: string; keypress: string }) {
  const adminClient = createAdminClient();
  const { data } = await adminClient.from('call_logs').select('menu_path').eq('id', callLogId).single();
  const path = Array.isArray(data?.menu_path) ? data!.menu_path : [];
  await adminClient.from('call_logs').update({ menu_path: [...path, entry] }).eq('id', callLogId);
}

export async function finalizeCallLog(callLogId: string, fields: Partial<{
  outcome: string;
  call_status: string;
  ended_at: string;
  duration_seconds: number;
  recording_url: string;
  voicemail_url: string;
  voicemail_duration_seconds: number;
}>) {
  const adminClient = createAdminClient();
  await adminClient.from('call_logs').update(fields).eq('id', callLogId);
}

// Same admin/owner-email lookup pattern as src/app/api/hr/leave/route.ts's
// getWorkspaceAdminEmails() — duplicated locally rather than imported since that one is a
// route-private helper, not a shared export.
async function getWorkspaceAdminEmails(adminClient: ReturnType<typeof createAdminClient>, workspaceId: string): Promise<{ id: string; email: string }[]> {
  const { data: workspace } = await adminClient.from('workspaces').select('owner_id').eq('id', workspaceId).single();
  const { data: adminMembers } = await adminClient
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .in('role', ['admin', 'owner']);

  const userIds = new Set<string>();
  if (workspace?.owner_id) userIds.add(workspace.owner_id);
  adminMembers?.forEach((m) => userIds.add(m.user_id));
  if (userIds.size === 0) return [];

  const { data: users } = await adminClient.auth.admin.listUsers();
  return (users?.users ?? [])
    .filter((u) => userIds.has(u.id))
    .map((u) => ({ id: u.id, email: u.email ?? '' }))
    .filter((u) => u.email);
}

// Notifies every workspace admin/owner that a real voicemail was left — in-app notification +
// email, reusing sendEmail() per the established pattern rather than a new delivery path.
export async function notifyVoicemailLeft(workspaceId: string, callLogId: string, fromNumber: string) {
  const adminClient = createAdminClient();
  try {
    const admins = await getWorkspaceAdminEmails(adminClient, workspaceId);
    if (admins.length === 0) {
      logger.warn({ workspaceId, callLogId }, 'ivr.voicemail_notify.no_admins');
      return;
    }

    await adminClient.from('notifications').insert(
      admins.map((a) => ({
        workspace_id: workspaceId,
        user_id: a.id,
        type: 'voicemail',
        title: 'New voicemail received',
        message: `A caller from ${fromNumber} left a voicemail.`,
        link: '/settings?tab=phone',
        read: false,
      }))
    );

    await Promise.all(
      admins.map((a) =>
        sendEmail({
          to: a.email,
          subject: `New voicemail from ${fromNumber}`,
          text: `A caller from ${fromNumber} left a voicemail. Listen to it in LeadsMind under Settings → Phone & IVR.`,
        }).catch((err) => logger.error({ err, workspaceId, callLogId }, 'ivr.voicemail_notify.email_failed'))
      )
    );
  } catch (err) {
    logger.error({ err, workspaceId, callLogId }, 'ivr.voicemail_notify.failed');
  }
}
