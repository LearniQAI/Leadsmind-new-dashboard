import { parse } from 'tldts';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/shared/logger';
import { ResendProvider } from './provider/resend';
import { EmailProviderError, type EmailSendingProvider, type ProviderDomain } from './provider/types';

/**
 * LeadsMind-managed sending domains. Each domain is created in the PLATFORM's Resend account, and
 * Resend's own verification status is stored and trusted. There's no independent DNS guessing:
 * Resend tells us the exact records (send.<domain> SPF TXT + MX to amazonses, and a
 * resend._domainkey DKIM `p=...` key) and whether they check out.
 */

export class SendingDomainError extends Error {
  readonly userSafe = true as const;
  constructor(message: string) {
    super(message);
    this.name = 'SendingDomainError';
  }
}

/** Unverified claims on a domain block other workspaces for this long, then can be taken over. */
export const STALE_CLAIM_HOURS = 72;

// Domains LeadsMind itself sends from. A customer can never claim one, and removing a row that
// points at one must never delete it from the platform account.
const PLATFORM_DOMAIN_ROOTS = ['leadsmind.io', 'resend.dev'];

export function isPlatformOwnedDomain(domain: string): boolean {
  const d = domain.toLowerCase();
  return PLATFORM_DOMAIN_ROOTS.some((root) => d === root || d.endsWith(`.${root}`));
}

export function normalizeSendingDomain(input: string): string | null {
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/[/:].*$/, '').replace(/\.$/, '');
  const parsed = parse(host, { allowPrivateDomains: false });
  if (parsed.isIp || !parsed.domain || !parsed.hostname || parsed.hostname !== host) return null;
  return host;
}

export function getPlatformEmailProvider(): EmailSendingProvider {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) throw new SendingDomainError('The LeadsMind email service is not configured.');
  return new ResendProvider(key);
}

/** Row fields derived from the provider's view of the domain. */
export function domainStateColumns(d: ProviderDomain) {
  const allVerified = (purpose: 'SPF' | 'DKIM') => {
    const recs = d.records.filter((r) => r.purpose === purpose);
    return recs.length > 0 && recs.every((r) => r.status === 'verified');
  };
  return {
    status: d.status,
    records: d.records,
    region: d.region ?? null,
    spf_status: allVerified('SPF'),
    dkim_status: allVerified('DKIM'),
    verified_at: d.status === 'verified' ? new Date().toISOString() : null,
    last_checked_at: new Date().toISOString(),
  };
}

function providerMessage(err: unknown, fallback: string): string {
  if (err instanceof EmailProviderError) {
    if (/already|registered|exists/i.test(err.message)) {
      // Resend holds each domain in one account only, across ALL Resend customers (and refuses
      // reserved names), so this is not necessarily another LeadsMind workspace.
      return 'This domain is already registered with the email provider, possibly in another Resend account. If you manage it in your own Resend account, remove it there first or connect that account under Email provider.';
    }
    return err.message || fallback;
  }
  return fallback;
}

export async function registerSendingDomain(
  workspaceId: string,
  rawName: string,
  provider: EmailSendingProvider = getPlatformEmailProvider(),
) {
  const name = normalizeSendingDomain(rawName);
  if (!name) throw new SendingDomainError('Enter a valid domain, like mail.yourcompany.com.');
  if (isPlatformOwnedDomain(name)) throw new SendingDomainError('LeadsMind platform domains cannot be added as a sending domain.');

  const db = createAdminClient();
  const { data: existing, error: lookupError } = await db
    .from('sender_domains')
    .select('id, workspace_id, status, created_at, provider_domain_id')
    .eq('domain_name', name)
    .maybeSingle();
  if (lookupError) throw new Error(`sending-domain lookup failed: ${lookupError.message}`);

  if (existing) {
    if (existing.workspace_id === workspaceId) throw new SendingDomainError('This domain is already added to this workspace.');
    if (existing.status === 'verified') throw new SendingDomainError('This domain is already verified by another workspace.');
    const ageHours = (Date.now() - new Date(existing.created_at).getTime()) / 3_600_000;
    if (ageHours < STALE_CLAIM_HOURS) {
      throw new SendingDomainError(
        `Another workspace started verifying this domain. If you own it, try again after ${new Date(new Date(existing.created_at).getTime() + STALE_CLAIM_HOURS * 3_600_000).toUTCString()}.`,
      );
    }
    // A stale, never-verified claim: whoever proves DNS ownership wins, so release it.
    await removeProviderDomain(provider, name, existing.provider_domain_id);
    const { error } = await db.from('sender_domains').delete().eq('id', existing.id);
    if (error) throw new Error(`stale claim release failed: ${error.message}`);
    logger.info({ domain: name, from: existing.workspace_id, to: workspaceId }, 'sending_domain.stale_claim.taken_over');
  }

  let created: ProviderDomain;
  try {
    created = await provider.createDomain(name);
  } catch (err) {
    logger.warn({ err, domain: name, workspaceId }, 'sending_domain.provider_create.failed');
    throw new SendingDomainError(providerMessage(err, 'Could not register this domain with the email service.'));
  }

  const { count: defaults } = await db
    .from('sender_domains')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('is_default', true);

  const { data: row, error: insertError } = await db
    .from('sender_domains')
    .insert({
      workspace_id: workspaceId,
      domain_name: name,
      provider: provider.name,
      provider_domain_id: created.id,
      is_default: !defaults,
      dmarc_status: false,
      ...domainStateColumns(created),
    })
    .select()
    .single();

  if (insertError) {
    // Never leave a provider domain with no row to find it by.
    await removeProviderDomain(provider, name, created.id).catch((err) =>
      logger.error({ err, domain: name, providerDomainId: created.id }, 'sending_domain.rollback.failed'),
    );
    if (insertError.code === '23505') throw new SendingDomainError('This domain was just added by another workspace.');
    throw new Error(`sending-domain insert failed: ${insertError.message}`);
  }
  return row;
}

async function removeProviderDomain(provider: EmailSendingProvider, name: string, providerDomainId: string | null) {
  if (!providerDomainId || isPlatformOwnedDomain(name)) return;
  await provider.deleteDomain(providerDomainId);
}

/** Asks the provider to re-check DNS and stores its answer. */
export async function refreshSendingDomain(
  workspaceId: string,
  domainId: string,
  provider: EmailSendingProvider = getPlatformEmailProvider(),
) {
  const db = createAdminClient();
  const { data: row } = await db
    .from('sender_domains')
    .select('id, domain_name, provider_domain_id')
    .eq('id', domainId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!row) throw new SendingDomainError('Sending domain not found.');
  if (!row.provider_domain_id) {
    throw new SendingDomainError('This domain was added before LeadsMind managed sending. Remove it and add it again.');
  }

  let domain: ProviderDomain;
  try {
    domain = await provider.verifyDomain(row.provider_domain_id);
  } catch (err) {
    throw new SendingDomainError(providerMessage(err, 'Could not check this domain with the email service.'));
  }

  const { checkDmarc } = await import('./senderDomainVerification');
  const dmarc = await checkDmarc(row.domain_name).catch(() => false);

  const { data: updated, error } = await db
    .from('sender_domains')
    .update({ ...domainStateColumns(domain), dmarc_status: dmarc })
    .eq('id', domainId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  if (error) throw new Error(`sending-domain update failed: ${error.message}`);
  return updated;
}

/** domain.updated webhook: store the provider's new status (and fresh records) for that domain. */
export async function applyProviderDomainUpdate(providerDomainId: string, provider: EmailSendingProvider = getPlatformEmailProvider()) {
  const db = createAdminClient();
  const { data: row } = await db.from('sender_domains').select('id').eq('provider_domain_id', providerDomainId).maybeSingle();
  if (!row) return false;
  const domain = await provider.getDomain(providerDomainId);
  const { error } = await db.from('sender_domains').update(domainStateColumns(domain)).eq('id', row.id);
  if (error) throw new Error(`sending-domain update failed: ${error.message}`);
  return true;
}

/** Removes the domain from the provider FIRST; the row is kept if that fails (retryable). */
export async function removeSendingDomain(
  workspaceId: string,
  domainId: string,
  provider: EmailSendingProvider = getPlatformEmailProvider(),
) {
  const db = createAdminClient();
  const { data: row } = await db
    .from('sender_domains')
    .select('id, domain_name, provider_domain_id, is_default')
    .eq('id', domainId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (!row) throw new SendingDomainError('Sending domain not found.');

  try {
    await removeProviderDomain(provider, row.domain_name, row.provider_domain_id);
  } catch (err) {
    throw new SendingDomainError(providerMessage(err, 'Could not remove this domain from the email service. Try again.'));
  }

  const { error } = await db.from('sender_domains').delete().eq('id', domainId).eq('workspace_id', workspaceId);
  if (error) throw new Error(`sending-domain delete failed: ${error.message}`);

  if (row.is_default) {
    const { data: next } = await db
      .from('sender_domains')
      .select('id')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (next) await db.from('sender_domains').update({ is_default: true }).eq('id', next.id);
  }
}

/** From identity for a domain: local part + display name, and which domain is the default. */
export async function updateSendingDomainIdentity(
  workspaceId: string,
  domainId: string,
  patch: { fromLocalPart?: string; fromName?: string | null; makeDefault?: boolean },
) {
  const db = createAdminClient();
  const update: Record<string, unknown> = {};
  if (patch.fromLocalPart !== undefined) {
    const local = patch.fromLocalPart.trim();
    if (!/^[A-Za-z0-9._%+-]{1,64}$/.test(local)) throw new SendingDomainError('Enter a valid From name before the @, like hello or team.');
    update.from_local_part = local;
  }
  if (patch.fromName !== undefined) update.from_name = patch.fromName?.trim() || null;

  if (patch.makeDefault) {
    const { error } = await db.from('sender_domains').update({ is_default: false }).eq('workspace_id', workspaceId).eq('is_default', true);
    if (error) throw new Error(`default reset failed: ${error.message}`);
    update.is_default = true;
  }

  const { data, error } = await db
    .from('sender_domains')
    .update(update)
    .eq('id', domainId)
    .eq('workspace_id', workspaceId)
    .select()
    .single();
  if (error) throw new Error(`sending-domain identity update failed: ${error.message}`);
  return data;
}

/** The workspace's managed From identity: its default domain if verified, else any verified one. */
export async function resolveManagedFromIdentity(workspaceId: string) {
  const db = createAdminClient();
  const { data, error } = await db
    .from('sender_domains')
    .select('id, domain_name, from_local_part, from_name, is_default, status, paused_at')
    .eq('workspace_id', workspaceId)
    .eq('status', 'verified')
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return { fromEmail: `${data.from_local_part}@${data.domain_name}`, fromName: data.from_name as string | null };
}
