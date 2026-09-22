// Classifies Twilio SMS delivery-status ErrorCode values, and records the ones that are shaped like
// "this destination number can never receive SMS" toward the same soft-fail-threshold pattern already
// used for email (contacts.soft_bounce_count / consecutive_soft_bounces, flag invalid at
// consecutive>=3 OR total>=5 — see webhooks/email/deliverability/route.ts). None of these codes is
// unambiguous proof on a single occurrence (Twilio's own dictionary hedges nearly every one: "may no
// longer exist", "usually... temporarily unreachable"), so a single occurrence is recorded but never
// immediately flags the number invalid.
//
// 21610 ("recipient replied STOP to Twilio") is NOT handled here — it is a consent signal, already
// handled by recordSmsOptOut on its own path, and must never be conflated with a dead-number fact.
//
// Deliberately NOT counted (verified against Twilio's error dictionary before building this):
//   30001 queue overflow, 30002 account suspended — about the SENDER/account, not the destination
//     number at all;
//   30007 carrier/content filtering — Twilio's own docs describe this as message-content-specific
//     ("a different message to the same number could succeed"); counting it would risk flagging a
//     perfectly reachable number just because one message's wording tripped a filter;
//   30008 unknown/indeterminate, 30009 missing segment — not a statement about the destination number.
const DESTINATION_SOFT_FAIL_CODES = new Set([
  '30003', // Unreachable destination handset (often transient — powered off/out of coverage — but also the code for a genuinely dead handset)
  '30004', // Message blocked (ambiguous: could be landline/dead number, or carrier/compliance filtering)
  '30005', // Unknown destination handset ("may no longer exist")
  '30006', // Landline or unreachable carrier (a landline sub-case here is permanent; code doesn't distinguish)
]);

export function isDestinationSoftFailCode(errorCode: string | null | undefined): boolean {
  return !!errorCode && DESTINATION_SOFT_FAIL_CODES.has(String(errorCode).trim());
}

export interface SmsSoftFailOutcome {
  flagged: boolean;
  total?: number;
  consecutive?: number;
}

/**
 * Records one destination-shaped delivery failure for a contact and, once the threshold is crossed,
 * flags the number invalid (contacts.sms_invalid) and writes a durable, workspace+phone suppression
 * row (reason='invalid_number') that sendSMS's existing gate already enforces. Atomic (one RPC
 * transaction): two near-simultaneous failures for the same contact across different campaigns cannot
 * both cross the threshold without the flag landing exactly once.
 */
export async function recordSmsSoftFail(
  supabase: any,
  args: { workspaceId: string; contactId: string; phoneE164: string | null; errorCode: string; messageSid: string },
): Promise<SmsSoftFailOutcome> {
  const { data, error } = await supabase.rpc('record_sms_soft_fail', {
    p_workspace_id: args.workspaceId,
    p_contact_id: args.contactId,
    p_phone_e164: args.phoneE164,
    p_error_code: args.errorCode,
    p_message_sid: args.messageSid,
  });
  if (error) throw new Error(`record_sms_soft_fail failed: ${error.message}`);
  return { flagged: !!data?.flagged, total: data?.total, consecutive: data?.consecutive };
}

/** A DELIVERED receipt resets the consecutive-failure streak (mirrors email's bounce-reset-on-success). */
export async function resetSmsSoftFailStreak(supabase: any, contactId: string): Promise<void> {
  const { error } = await supabase.rpc('reset_sms_soft_fail_streak', { p_contact_id: contactId });
  if (error) throw new Error(`reset_sms_soft_fail_streak failed: ${error.message}`);
}
