import dns from 'dns'
import { createAdminClient } from '@/lib/supabase/server'
import { addDomainToProject, getDomainStatus } from './vercel'
import { logger } from '@/shared/logger'

const dnsPromises = dns.promises

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
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)
    return { success: true, status: nextStatus }
  }

  try {
    // 2. Register/Add custom domain to Vercel project to kick off SSL provisioning
    const addRes = await addDomainToProject(domain.hostname)
    if (!addRes.success) {
      return {
        success: false,
        status: domain.status || 'verifying',
        error: addRes.error || 'Failed to add domain to Vercel project'
      }
    }

    // Transition database status to 'verifying' if it is currently 'pending'
    if (domain.status === 'pending') {
      await supabase
        .from('domain_configurations')
        .update({
          status: 'verifying',
          updated_at: new Date().toISOString()
        })
        .eq('id', domainId)
      domain.status = 'verifying'
    }

    // 3. Ownership check: verify presence of TXT token at _leadsmind-verify.<domain>
    if (domain.verification_token) {
      try {
        const txtRecords = await dnsPromises.resolveTxt(`_leadsmind-verify.${domain.hostname}`)
        const matched = txtRecords.some(record => record.includes(domain.verification_token))
        if (!matched) {
          return {
            success: false,
            status: 'verifying',
            error: 'TXT ownership token not found at _leadsmind-verify.' + domain.hostname
          }
        }
      } catch (e: any) {
        return {
          success: false,
          status: 'verifying',
          error: 'TXT ownership lookup failed: ' + (e.message || 'DNS error')
        }
      }
    }

    // 4. Config check: query Vercel config API for verified status and correct routing (non-misconfigured)
    const statusRes = await getDomainStatus(domain.hostname)
    if (!statusRes.success) {
      return {
        success: false,
        status: 'verifying',
        error: statusRes.error || 'Failed to query Vercel domain config'
      }
    }

    if (!statusRes.verified) {
      return {
        success: false,
        status: 'verifying',
        error: 'Domain added to Vercel project, but DNS mapping or SSL certificate generation is still in progress'
      }
    }

    // 5. Mark domain active on successful DNS & SSL check
    const nextStatus = 'active'
    await supabase
      .from('domain_configurations')
      .update({
        status: nextStatus,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', domainId)

    return { success: true, status: nextStatus }
  } catch (err: any) {
    logger.error({ err, domainId }, 'domains.verify.dns_check.failed');
    return {
      success: false,
      status: domain.status || 'verifying',
      error: 'DNS verification failed'
    }
  }
}
