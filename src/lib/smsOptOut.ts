// SMS/WhatsApp opt-out: one implementation for recording (STOP webhook), checking (sendSMS) and
// clearing (START). An opt-out is honoured if EITHER the durable suppression list
// (sms_suppression_list, keyed by workspace + E.164 phone — survives contact delete/re-import) OR
// the contact-row flags (sms_opt_out / opted_out — also set by other UI paths) say so. The flags
// are unified across SMS and WhatsApp (migration 20260823000002), so one opt-out covers both.
import { normalizePhone } from '@/lib/phone';

// Thrown by sendSMS instead of sending to an opted-out number. Not a delivery failure: callers
// treat it as "skipped" (the executor skips the step, the bulk worker counts skipped_opt_out).
export class SmsOptedOutError extends Error {
  readonly userSafe = true as const;
  constructor(readonly reason: 'suppression_list' | 'contact_flag') {
    super('This contact has opted out of SMS/WhatsApp messages (STOP).');
    this.name = 'SmsOptedOutError';
  }
}

/** Why this number may not be messaged in this workspace, or null if it may. Throws on lookup errors (fail closed). */
export async function getSmsOptOutReason(
  supabase: any,
  workspaceId: string,
  phone: string,
): Promise<'suppression_list' | 'contact_flag' | null> {
  const e164 = normalizePhone(phone);
  if (!e164) return null; // not a number we can identify: nothing to match a STOP against

  const [{ data: listed, error: listErr }, { data: flagged, error: flagErr }] = await Promise.all([
    supabase.from('sms_suppression_list').select('id').eq('workspace_id', workspaceId).eq('phone_e164', e164).limit(1),
    supabase.from('contacts').select('id')
      .eq('workspace_id', workspaceId).eq('phone_e164', e164)
      .or('sms_opt_out.eq.true,opted_out.eq.true')
      .limit(1),
  ]);
  if (listErr || flagErr) throw new Error(`SMS opt-out lookup failed: ${(listErr ?? flagErr).message}`);
  if (listed && listed.length > 0) return 'suppression_list';
  if (flagged && flagged.length > 0) return 'contact_flag';
  return null;
}

/**
 * Records a STOP. With a workspace: durable list row + flags on that workspace's matching contacts.
 * With workspaceId=null (a STOP to a PLATFORM-level number, which belongs to no workspace) the flags
 * are set on every matching contact — over-suppressing is the safe side for consent.
 * Returns the affected contact ids (used to cancel their running SMS workflows).
 */
export async function recordSmsOptOut(
  supabase: any,
  args: { workspaceId: string | null; phone: string; source: string; messageSid?: string | null },
): Promise<{ e164: string | null; contactIds: string[] }> {
  const e164 = normalizePhone(args.phone);
  if (!e164) return { e164: null, contactIds: [] };
  const now = new Date().toISOString();

  if (args.workspaceId) {
    const { error } = await supabase.from('sms_suppression_list').upsert(
      { workspace_id: args.workspaceId, phone_e164: e164, reason: 'stop_keyword', source: args.source, message_sid: args.messageSid ?? null, suppressed_at: now },
      { onConflict: 'workspace_id,phone_e164' },
    );
    if (error) throw new Error(`Failed to record SMS opt-out: ${error.message}`);
  }

  let q = supabase.from('contacts').select('id').eq('phone_e164', e164);
  if (args.workspaceId) q = q.eq('workspace_id', args.workspaceId);
  const { data: contacts, error: cErr } = await q;
  if (cErr) throw new Error(`Failed to look up contacts for opt-out: ${cErr.message}`);
  const contactIds = (contacts ?? []).map((c: any) => c.id);

  if (contactIds.length > 0) {
    const { error } = await supabase.from('contacts')
      .update({ opted_in: false, opted_out: true, opt_out_date: now, sms_opt_out: true, sms_opt_out_at: now })
      .in('id', contactIds);
    if (error) throw new Error(`Failed to flag contacts as opted out: ${error.message}`);
  }
  return { e164, contactIds };
}

/** START/UNSTOP/YES: lifts the opt-out for THIS workspace only (never for a platform-level number). */
export async function clearSmsOptOut(supabase: any, args: { workspaceId: string; phone: string }): Promise<{ e164: string | null; contactIds: string[] }> {
  const e164 = normalizePhone(args.phone);
  if (!e164) return { e164: null, contactIds: [] };

  const { error } = await supabase.from('sms_suppression_list').delete().eq('workspace_id', args.workspaceId).eq('phone_e164', e164);
  if (error) throw new Error(`Failed to clear SMS opt-out: ${error.message}`);

  const { data: contacts } = await supabase.from('contacts').select('id').eq('workspace_id', args.workspaceId).eq('phone_e164', e164);
  const contactIds = (contacts ?? []).map((c: any) => c.id);
  if (contactIds.length > 0) {
    await supabase.from('contacts')
      .update({ opted_in: true, opted_out: false, opt_out_date: null, sms_opt_out: false, sms_opt_out_at: null })
      .in('id', contactIds);
  }
  return { e164, contactIds };
}
