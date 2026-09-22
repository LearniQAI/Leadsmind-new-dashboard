// Which number a workspace SENDS SMS/WhatsApp from.
//
// SOURCE OF TRUTH: workspaces.twilio_number. Every sender (automations, LMS, bulk SMS, review
// requests, reminders...), the inbound STOP webhook (routes by the number that was texted), the
// delivery-status webhook (routes by the sending number) and the readiness check all read this one
// field. workspace_phone_numbers is the INVENTORY of numbers the workspace owns (purchased or
// imported in-app, also used by voice/IVR). Buying or importing a number used to touch only the
// inventory, so an in-app purchase could never actually be used to send. These helpers keep the two
// consistent. They take the ADMIN client and a workspace id the caller has already authorised.
import { normalizePhone } from '@/lib/phone';

export interface OwnedNumber {
  id?: string;
  phone_number: string;
  capabilities?: { voice?: boolean; sms?: boolean; mms?: boolean } | null;
}

const sameNumber = (a: string | null | undefined, b: string | null | undefined) => {
  const x = normalizePhone(a); const y = normalizePhone(b);
  return !!x && x === y;
};

export async function getSmsSenderNumber(admin: any, workspaceId: string): Promise<string | null> {
  const { data } = await admin.from('workspaces').select('twilio_number').eq('id', workspaceId).maybeSingle();
  return data?.twilio_number || null;
}

/**
 * A newly acquired number becomes the sender ONLY if the workspace has none yet and the number can
 * send SMS. Conditional in the database (WHERE twilio_number IS NULL/empty), so it can never
 * overwrite a sender someone chose, even under a race. Returns whether it was adopted.
 */
export async function adoptSmsSenderIfNone(admin: any, workspaceId: string, number: OwnedNumber): Promise<boolean> {
  if (!number.capabilities?.sms) return false;
  const { data, error } = await admin
    .from('workspaces')
    .update({ twilio_number: number.phone_number })
    .eq('id', workspaceId)
    .or('twilio_number.is.null,twilio_number.eq.')
    .select('id');
  if (error) throw new Error(`Failed to set the SMS sender number: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export type SetSenderResult =
  | { ok: true; phone: string }
  | { ok: false; reason: 'not_found' | 'released' | 'not_sms_capable' };

/** Explicitly choose an owned, active, SMS-capable number as the sender. */
export async function setSmsSender(admin: any, workspaceId: string, numberRowId: string): Promise<SetSenderResult> {
  const { data: row } = await admin
    .from('workspace_phone_numbers')
    .select('id, phone_number, capabilities, status')
    .eq('id', numberRowId).eq('workspace_id', workspaceId).maybeSingle();
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.status !== 'active') return { ok: false, reason: 'released' };
  if (!row.capabilities?.sms) return { ok: false, reason: 'not_sms_capable' };

  const { error } = await admin.from('workspaces').update({ twilio_number: row.phone_number }).eq('id', workspaceId);
  if (error) throw new Error(`Failed to set the SMS sender number: ${error.message}`);
  return { ok: true, phone: row.phone_number };
}

/**
 * After a number is released: if it was the sender, promote the most recent OTHER active SMS-capable
 * number, or clear the sender (a released number cannot send, and leaving it set would make the
 * workspace look ready while every send failed). Returns the new sender, or null.
 */
export async function reassignSenderAfterRelease(admin: any, workspaceId: string, releasedPhone: string): Promise<string | null> {
  const current = await getSmsSenderNumber(admin, workspaceId);
  if (!sameNumber(current, releasedPhone)) return current; // unaffected

  const { data: others } = await admin
    .from('workspace_phone_numbers')
    .select('phone_number, capabilities')
    .eq('workspace_id', workspaceId).eq('status', 'active')
    .order('created_at', { ascending: false });
  const next = (others ?? []).find((n: any) => n.capabilities?.sms && !sameNumber(n.phone_number, releasedPhone));

  const { error } = await admin.from('workspaces').update({ twilio_number: next?.phone_number ?? null }).eq('id', workspaceId);
  if (error) throw new Error(`Failed to update the SMS sender number: ${error.message}`);
  return next?.phone_number ?? null;
}

export function isSmsSender(senderNumber: string | null | undefined, phone: string): boolean {
  return sameNumber(senderNumber, phone);
}
