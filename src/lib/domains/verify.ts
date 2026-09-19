import dns from 'dns'
import { createAdminClient } from '@/lib/supabase/server'
import { addDomainToProject, getDomainStatus, removeDomainFromProject } from './vercel'
import { logger } from '@/shared/logger'
import { CUSTOM_DOMAIN_CNAME_TARGET } from './config'
import { describeDns } from './hostname'

const dnsPromises = dns.promises

export type HostCheckStage = 'txt' | 'claim' | 'vercel_add' | 'vercel_status' | 'ready'

export type OwnershipClaim = () => Promise<{ ok: boolean; error?: string }>

/**
 * The real ownership + routing check, shared by every custom-domain surface. Order matters:
 * ownership is proven BEFORE anything is attached to Vercel, so an unproven hostname is never
 * added to the project.
 *   1. TXT token at _leadsmind-verify.<host> (a real DNS lookup; a missing token fails).
 *   2. claimOwnership(): record the proven claim. Only one workspace can hold a proven claim
 *      on a hostname, so this is where a competing workspace is turned away.
 *   3. Attach the host to the Vercel project.
 *   4. Require Vercel to report the host verified and not misconfigured.
 */
export async function checkHostReady(
  hostname: string,
  verificationToken: string | null | undefined,
  claimOwnership: OwnershipClaim,
): Promise<{
  ready: boolean
  stage: HostCheckStage
  /** Vercel reports the domain's DNS pointing at us (only meaningful from the vercel_status stage). */
  dnsPointed?: boolean
  error?: string
}> {
  const txtName = `_leadsmind-verify.${hostname}`
  const txtHost = describeDns(hostname)?.txtHost ?? txtName
  if (!verificationToken) {
    return { ready: false, stage: 'txt', error: 'This domain has no verification token. Remove it and add it again.' }
  }
  try {
    const txtRecords = await dnsPromises.resolveTxt(txtName)
    const matched = txtRecords.some(record => record.includes(verificationToken))
    if (!matched) {
      return {
        ready: false,
        stage: 'txt',
        error: `A TXT record exists at ${txtHost} but its value doesn't match your verification token. Copy the token again and replace the value.`,
      }
    }
  } catch (e: any) {
    if (e?.code === 'ENOTFOUND' || e?.code === 'ENODATA') {
      return {
        ready: false,
        stage: 'txt',
        error: `No TXT record found at ${txtHost} yet. If you just added it, DNS changes can take a few minutes up to 48 hours to spread — try again later.`,
      }
    }
    return { ready: false, stage: 'txt', error: 'Could not look up the TXT record right now (' + (e?.code || e?.message || 'DNS error') + '). Try again shortly.' }
  }

  const claim = await claimOwnership()
  if (!claim.ok) {
    return { ready: false, stage: 'claim', error: claim.error || 'Could not claim this domain.' }
  }

  const addRes = await addDomainToProject(hostname)
  if (!addRes.success) {
    return { ready: false, stage: 'vercel_add', error: addRes.error || 'Failed to add domain to Vercel project' }
  }

  const statusRes = await getDomainStatus(hostname)
  if (!statusRes.success) {
    return { ready: false, stage: 'vercel_status', error: statusRes.error || 'Failed to query Vercel domain config' }
  }
  if (!statusRes.verified) {
    const dnsPointed = !!statusRes.dnsPointed
    return {
      ready: false,
      stage: 'vercel_status',
      dnsPointed,
      error: dnsPointed
        ? 'Your DNS is pointing correctly. The SSL certificate is being issued — this usually takes a few minutes.'
        : `Ownership confirmed. Waiting for your CNAME record to point to ${CUSTOM_DOMAIN_CNAME_TARGET} — DNS changes can take a few minutes up to 48 hours to spread.`,
    }
  }
  return { ready: true, stage: 'ready' }
}

/**
 * Record a proven ownership claim on one row of one of the two custom-domain tables. Refuses if
 * the hostname is already proven by another row in either table (the partial unique indexes make
 * the same-table case race-safe). Idempotent for a row that is already proven.
 */
export function claimHostOwnership(
  kind: 'custom' | 'website',
  rowId: string,
  hostname: string,
): OwnershipClaim {
  return async () => {
    const supabase = createAdminClient()
    const table = kind === 'custom' ? 'domain_configurations' : 'builder_published_domains'
    const otherTable = kind === 'custom' ? 'builder_published_domains' : 'domain_configurations'
    const hostColumn = kind === 'custom' ? 'hostname' : 'domain_name'
    const otherHostColumn = kind === 'custom' ? 'domain_name' : 'hostname'

    const { data: own } = await supabase.from(table).select('ownership_verified_at').eq('id', rowId).maybeSingle()
    if (own?.ownership_verified_at) return { ok: true }

    const { data: otherProven } = await supabase
      .from(otherTable)
      .select('id')
      .eq(otherHostColumn, hostname)
      .not('ownership_verified_at', 'is', null)
      .limit(1)
    if (otherProven && otherProven.length > 0) {
      return { ok: false, error: 'This domain has already been verified by another workspace.' }
    }

    const { error } = await supabase
      .from(table)
      .update({ ownership_verified_at: new Date().toISOString() })
      .eq('id', rowId)
      .is('ownership_verified_at', null)
    if (error) {
      if (error.code === '23505') {
        return { ok: false, error: 'This domain has already been verified by another workspace.' }
      }
      logger.error({ err: error, rowId, hostColumn }, 'domains.claim_ownership.failed')
      return { ok: false, error: 'Could not claim this domain. Try again.' }
    }
    return { ok: true }
  }
}

/**
 * Detach a hostname from the Vercel project before its database row is deleted. Only the PROVEN
 * holder of a hostname is ever attached (see checkHostReady), so an unproven row has nothing to
 * release — and must not touch Vercel, because the same hostname may be attached for a different
 * workspace's proven claim. If Vercel refuses, the caller must keep the row: deleting it anyway
 * would leave the domain attached to the project with no record left to find it by.
 */
export async function releaseHostFromVercel(
  hostname: string,
  ownershipVerifiedAt: string | null | undefined,
): Promise<{ ok: boolean; error?: string }> {
  if (!ownershipVerifiedAt) return { ok: true }
  if (process.env.MOCK_DNS_VERIFICATION === 'true') return { ok: true }

  const res = await removeDomainFromProject(hostname)
  if (res.success) return { ok: true }
  logger.error({ hostname, vercelError: res.error }, 'domains.release_from_vercel.failed')
  return {
    ok: false,
    error: `Could not disconnect ${hostname} from the hosting provider (${res.error || 'unknown error'}). The domain was not deleted — try again.`,
  }
}

export async function verifyDns(domainId: string): Promise<{
  success: boolean
  status: string
  error?: string
}> {
  const supabase = createAdminClient()
  const { data: domain, error: fetchError } = await supabase
    .from('domain_configurations')
    .select('*')
    .eq('id', domainId)
    .maybeSingle()

  if (fetchError || !domain) {
    return { success: false, status: 'error', error: 'Domain configuration not found' }
  }

  // 1. Mock DNS Verification for local dev escape hatch
  if (process.env.MOCK_DNS_VERIFICATION === 'true') {
    const nextStatus = 'active'
    await supabase
      .from('domain_configurations')
      .update({
        status: nextStatus,
        verified_at: new Date().toISOString(),
        ownership_verified_at: domain.ownership_verified_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
    return { success: true, status: nextStatus }
  }

  try {
    const check = await checkHostReady(
      domain.hostname,
      domain.verification_token,
      claimHostOwnership('custom', domainId, domain.hostname),
    )
    const checkedAt = new Date().toISOString()

    if (check.ready) {
      await supabase
        .from('domain_configurations')
        .update({
          status: 'active',
          verified_at: checkedAt,
          last_check_at: checkedAt,
          last_check_error: null,
          updated_at: checkedAt
        })
        .eq('id', domainId)
      return { success: true, status: 'active' }
    }

    // Progress states follow what was actually proven, in order:
    //   pending          - ownership (TXT) not proven yet
    //   verifying        - ownership proven, DNS not pointing at us yet
    //   ssl_provisioning - Vercel reports DNS pointing correctly, certificate still being issued
    // An already-active domain is never demoted by a failed re-check.
    const ownershipProven = check.stage !== 'txt' && check.stage !== 'claim'
    let nextStatus: string = domain.status
    if (domain.status !== 'active') {
      if (check.stage === 'vercel_status' && check.dnsPointed) nextStatus = 'ssl_provisioning'
      else if (ownershipProven) nextStatus = 'verifying'
    }

    await supabase
      .from('domain_configurations')
      .update({
        status: nextStatus,
        last_check_at: checkedAt,
        last_check_error: check.error ?? null,
        updated_at: checkedAt
      })
      .eq('id', domainId)

    return { success: false, status: nextStatus, error: check.error }
  } catch (err: any) {
    logger.error({ err, domainId }, 'domains.verify.dns_check.failed');
    return {
      success: false,
      status: domain.status || 'verifying',
      error: 'DNS verification failed'
    }
  }
}

/**
 * Website-builder counterpart of verifyDns: no session needed (the caller has already authorized
 * the row), so both the Verify button and the background cron can use it. builder_published_domains
 * has no multi-step status, only verified + ssl_status; progress detail lives in last_check_error.
 */
export async function verifyWebsiteDomainById(domainId: string): Promise<{
  ready: boolean
  error?: string
}> {
  const supabase = createAdminClient()
  const { data: domain } = await supabase
    .from('builder_published_domains')
    .select('id, domain_name, verification_token, verified')
    .eq('id', domainId)
    .maybeSingle()
  if (!domain) return { ready: false, error: 'Domain record not found' }

  const check = await checkHostReady(
    domain.domain_name,
    domain.verification_token,
    claimHostOwnership('website', domainId, domain.domain_name),
  )
  const checkedAt = new Date().toISOString()

  // A domain that was already verified is not demoted by a failed re-check (a transient
  // DNS/Vercel blip must not take a live site offline); only the diagnostic is recorded.
  const update: Record<string, unknown> = {
    last_check_at: checkedAt,
    last_check_error: check.ready ? null : (check.error ?? null),
    updated_at: checkedAt,
  }
  if (check.ready) {
    update.verified = true
    update.ssl_status = 'active'
  } else if (!domain.verified) {
    update.ssl_status = 'pending'
  }
  await supabase.from('builder_published_domains').update(update).eq('id', domainId)

  return { ready: check.ready, error: check.error }
}
