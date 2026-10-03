// Typed wrapper around the database function wa_record_consent. No UI, no callers yet (CE1 wires nothing in).
//
// The database function owns every rule: it refuses a number that ever withdrew consent (it can never flip a withdrawal
// back), is idempotent, and creates exactly one live record under concurrency. This wrapper only maps its result code to a
// type and fails closed: any transport or database error is { ok: false, code: 'error' }, never a success.
// SERVER-ONLY: uses the admin (service-role) client; the function is executable by service_role only.
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';

export interface RecordConsentInput {
  workspaceId: string;
  contactId?: string | null;
  phone: string;
  /** PENDING_VERIFICATION until a verification step exists (Phase 2); ACTIVE for an approved form submission. */
  status: 'PENDING_VERIFICATION' | 'ACTIVE';
  sourceType: string;
  sourceId?: string | null;
  sourceUrl?: string | null;
  formVersionId?: string | null;
  consentText: string;
  consentTextVersion: string;
  termsVersion?: string | null;
  privacyVersion?: string | null;
  consentedAt: Date | string;
  timezone?: string | null;
  ipHash?: string | null;
  userAgent?: string | null;
  actor?: string | null;
}

export type RecordConsentOk = 'created' | 'activated' | 'already_active' | 'already_pending';
export type RecordConsentRefusal = 'previously_opted_out' | 'invalid_phone' | 'invalid_contact' | 'invalid_input';

export type RecordConsentResult =
  | { ok: true; code: RecordConsentOk }
  | { ok: false; code: RecordConsentRefusal | 'error' };

const OK_CODES = new Set<string>(['created', 'activated', 'already_active', 'already_pending']);
const REFUSAL_CODES = new Set<string>(['previously_opted_out', 'invalid_phone', 'invalid_contact', 'invalid_input']);

export function mapRecordConsentCode(code: unknown): RecordConsentResult {
  if (typeof code === 'string' && OK_CODES.has(code)) return { ok: true, code: code as RecordConsentOk };
  if (typeof code === 'string' && REFUSAL_CODES.has(code)) return { ok: false, code: code as RecordConsentRefusal };
  return { ok: false, code: 'error' };
}

type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> };

export async function recordWhatsAppConsent(input: RecordConsentInput, opts: { db?: RpcClient } = {}): Promise<RecordConsentResult> {
  try {
    const db = opts.db ?? (createAdminClient() as unknown as RpcClient);
    const consentedAt = input.consentedAt instanceof Date ? input.consentedAt.toISOString() : input.consentedAt;
    const { data, error } = await db.rpc('wa_record_consent', {
      p_workspace: input.workspaceId,
      p_contact_id: input.contactId ?? null,
      p_phone_e164: input.phone,
      p_status: input.status,
      p_source_type: input.sourceType,
      p_source_id: input.sourceId ?? null,
      p_source_url: input.sourceUrl ?? null,
      p_form_version_id: input.formVersionId ?? null,
      p_consent_text: input.consentText,
      p_consent_text_version: input.consentTextVersion,
      p_terms_version: input.termsVersion ?? null,
      p_privacy_version: input.privacyVersion ?? null,
      p_consented_at: consentedAt,
      p_timezone: input.timezone ?? null,
      p_ip_hash: input.ipHash ?? null,
      p_user_agent: input.userAgent ?? null,
      p_actor: input.actor ?? null,
    });
    if (error) throw error;
    return mapRecordConsentCode(data);
  } catch (err) {
    logger.error({ err, workspaceId: input.workspaceId }, 'whatsapp.consent.record_failed');
    return { ok: false, code: 'error' };
  }
}
