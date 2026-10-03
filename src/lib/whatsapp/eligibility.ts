// The only application entry point to WhatsApp marketing eligibility. It calls the database function wa_marketing_eligible,
// which DERIVES eligibility from an ACTIVE consent record (this workspace, the contact's current phone_e164) minus every
// suppression. Nothing here reads contacts.opted_in, tags or any client-supplied value.
//
// SERVER-ONLY by design: it uses the admin (service-role) client because the function is executable by service_role only.
// FAILS CLOSED: any error (network, database, malformed result) is returned as { ok: false }. An error is never an empty
// list that a caller could mistake for "nobody", and never a full list.
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export interface EligibleContact {
  contactId: string;
  phoneE164: string;
  consentId: string;
}

export type EligibilityResult =
  | { ok: true; contacts: EligibleContact[]; contactIds: string[] }
  | { ok: false; error: string };

export const ELIGIBILITY_UNAVAILABLE = 'Could not verify WhatsApp marketing eligibility. Nothing was sent.';

// PostgREST caps a set-returning RPC at max-rows (1000 by default), so results are paged and ids are chunked.
const PAGE = 1000;
const ID_CHUNK = 1000;

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => any };

async function fetchAll(db: RpcClient, workspaceId: string, ids: string[] | null): Promise<EligibleContact[]> {
  const out: EligibleContact[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .rpc('wa_marketing_eligible', { p_workspace: workspaceId, p_contact_ids: ids })
      .order('contact_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!Array.isArray(data)) throw new Error('wa_marketing_eligible returned no result set');
    for (const r of data) {
      if (!r || typeof r.contact_id !== 'string' || typeof r.phone_e164 !== 'string' || typeof r.consent_id !== 'string') {
        throw new Error('wa_marketing_eligible returned a malformed row');
      }
      out.push({ contactId: r.contact_id, phoneE164: r.phone_e164, consentId: r.consent_id });
    }
    if (data.length < PAGE) break;
  }
  return out;
}

/**
 * The contacts of `workspaceId` that may receive WhatsApp marketing right now.
 * `contactIds` omitted/null = every contact in the workspace; otherwise only those ids (ids from another workspace
 * silently return nothing). An empty array means "nobody was asked about" and returns an empty, successful result.
 */
export async function getEligibleContactIds(
  workspaceId: string,
  contactIds?: string[] | null,
  opts: { db?: RpcClient } = {},
): Promise<EligibilityResult> {
  try {
    if (!workspaceId || typeof workspaceId !== 'string') throw new Error('workspaceId is required');
    const db = opts.db ?? (createAdminClient() as unknown as RpcClient);

    let contacts: EligibleContact[];
    if (contactIds == null) {
      contacts = await fetchAll(db, workspaceId, null);
    } else {
      const unique = [...new Set(contactIds.filter((id) => typeof id === 'string' && id))];
      contacts = [];
      for (let i = 0; i < unique.length; i += ID_CHUNK) {
        contacts.push(...(await fetchAll(db, workspaceId, unique.slice(i, i + ID_CHUNK))));
      }
    }
    return { ok: true, contacts, contactIds: contacts.map((c) => c.contactId) };
  } catch (err) {
    logger.error({ err, workspaceId }, 'whatsapp.eligibility.lookup_failed');
    return { ok: false, error: ELIGIBILITY_UNAVAILABLE };
  }
}
