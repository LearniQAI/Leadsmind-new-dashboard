import type { SupabaseClient } from '@supabase/supabase-js';
import { escapeLikePattern } from '@/lib/campaigns/emailSuppression';

/**
 * Two separate states, never conflated:
 *  - SUPPRESSED (global_suppression_list, with a source): the recipient must not be emailed by
 *    this workspace: they opted out, complained, the address hard-bounced, it was erased, an
 *    admin added it by hand, or the provider refused it from its own account-level list.
 *  - INVALID ADDRESS (contacts.is_invalid_email): the mailbox itself does not work. Set ONLY by
 *    delivery evidence (hard bounce / repeated soft bounces), never by an opt-out.
 * Both block sending (emailSuppression.ts); only the second says anything about the address.
 */
export type SuppressionSource = 'unsubscribe' | 'bounce' | 'complaint' | 'manual' | 'erasure' | 'provider_suppressed';

/**
 * Workspace-scoped (never provider-account-wide: the platform Resend account is shared by every
 * workspace). The first recorded source wins: a later bounce does not relabel an opt-out.
 */
export async function suppressEmail(
  db: SupabaseClient,
  workspaceId: string,
  email: string,
  source: SuppressionSource,
  reason?: string,
): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const { data: existing, error: lookupError } = await db
    .from('global_suppression_list')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('email', escapeLikePattern(normalized))
    .limit(1);
  if (lookupError) throw new Error(`suppression lookup failed: ${lookupError.message}`);
  if (existing && existing.length > 0) return;

  const { error } = await db
    .from('global_suppression_list')
    .upsert(
      { workspace_id: workspaceId, email: normalized, source, reason: reason ?? source, suppressed_at: new Date().toISOString() },
      { onConflict: 'workspace_id,email', ignoreDuplicates: true },
    );
  if (error) throw new Error(`suppression insert failed: ${error.message}`);
}

/** Delivery evidence that the mailbox does not work (case-insensitive, workspace-scoped). */
export async function markAddressInvalid(db: SupabaseClient, workspaceId: string, email: string): Promise<void> {
  const pattern = escapeLikePattern(email.trim());
  for (const table of ['contacts', 'crm_contacts']) {
    const { error } = await db.from(table).update({ is_invalid_email: true }).eq('workspace_id', workspaceId).ilike('email', pattern);
    if (error) throw new Error(`${table} invalid-address update failed: ${error.message}`);
  }
}
