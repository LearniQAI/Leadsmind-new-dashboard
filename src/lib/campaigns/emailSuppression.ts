import type { SupabaseClient } from '@supabase/supabase-js';

// Single source of truth for "may this contact be emailed by a campaign?".
// Unsubscribe (popia.ts unsubscribeEmail) writes global_suppression_list +
// contacts.is_invalid_email; hard bounces/complaints (deliverability webhook)
// write is_invalid_email. Both must be honoured at enqueue time AND again at
// send time — a contact can unsubscribe between scheduling and dispatch.

const CHUNK = 100;

export interface SuppressionContact {
  id?: string;
  email?: string | null;
  workspace_id?: string | null;
  is_invalid_email?: boolean | null;
}

const key = (workspaceId: string, email: string) => `${workspaceId}|${email.trim().toLowerCase()}`;

/**
 * Set of "workspaceId|lowercased-email" present in global_suppression_list.
 * Loads each workspace's list (paginated) and compares case-insensitively in
 * code: stored casing is whatever the unsubscribe link carried, so an exact
 * SQL IN (email) match silently misses e.g. 'Ada@X.com' vs 'ada@x.com'
 * (confirmed live).
 */
export async function loadSuppressedEmails(
  supabase: SupabaseClient,
  workspaceIds: string[],
): Promise<Set<string>> {
  const suppressed = new Set<string>();
  const PAGE = 1000;
  for (const ws of [...new Set(workspaceIds)].filter(Boolean)) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await supabase
        .from('global_suppression_list')
        .select('workspace_id, email')
        .eq('workspace_id', ws)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      // Fail closed: if we cannot tell who is suppressed, do not send.
      if (error) throw new Error(`suppression lookup failed: ${error.message}`);
      for (const row of data ?? []) if (row.email) suppressed.add(key(row.workspace_id, row.email));
      if (!data || data.length < PAGE) break;
    }
  }
  return suppressed;
}

/** Pure decision used by both enqueue and the worker. */
export function suppressionReason(
  contact: SuppressionContact,
  workspaceId: string,
  suppressed: Set<string>,
): 'no_email' | 'invalid_email' | 'suppressed' | null {
  if (!contact.email) return 'no_email';
  if (contact.is_invalid_email) return 'invalid_email';
  if (suppressed.has(key(workspaceId, contact.email))) return 'suppressed';
  return null;
}

/** Escapes LIKE/ILIKE wildcards so an address is matched literally ('_' is common in emails). */
export function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

/**
 * Single-recipient version of the send-time gate, for automation/sequence
 * emails that go out one contact at a time (loading a workspace's whole
 * suppression list per send, as the campaign worker does per batch, would be
 * wasteful here). Case-insensitive, workspace-scoped, and fails closed: a
 * lookup error throws rather than reporting the contact as sendable.
 */
export async function checkEmailSuppression(
  supabase: SupabaseClient,
  workspaceId: string,
  contact: SuppressionContact,
): Promise<'no_email' | 'invalid_email' | 'suppressed' | null> {
  if (!contact.email) return 'no_email';
  if (contact.is_invalid_email) return 'invalid_email';
  const { data, error } = await supabase
    .from('global_suppression_list')
    .select('email')
    .eq('workspace_id', workspaceId)
    .ilike('email', escapeLikePattern(contact.email.trim()))
    .limit(1);
  if (error) throw new Error(`suppression lookup failed: ${error.message}`);
  return data && data.length > 0 ? 'suppressed' : null;
}

/**
 * Enqueue-time filter: returns only contact ids that are emailable right now.
 * Throws (fail closed) on lookup errors rather than silently queuing everyone.
 */
export async function filterEmailableContactIds(
  supabase: SupabaseClient,
  workspaceId: string,
  contactIds: string[],
): Promise<{ eligible: string[]; excluded: number }> {
  const contacts: SuppressionContact[] = [];
  for (let i = 0; i < contactIds.length; i += CHUNK) {
    const { data, error } = await supabase
      .from('contacts')
      .select('id, email, is_invalid_email')
      .eq('workspace_id', workspaceId)
      .in('id', contactIds.slice(i, i + CHUNK));
    if (error) throw new Error(`contact eligibility lookup failed: ${error.message}`);
    contacts.push(...(data ?? []));
  }
  const suppressed = await loadSuppressedEmails(supabase, [workspaceId]);
  const eligible = contacts
    .filter((c) => suppressionReason(c, workspaceId, suppressed) === null)
    .map((c) => c.id as string);
  return { eligible, excluded: contactIds.length - eligible.length };
}
