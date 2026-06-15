import dns from 'dns'
import { createAdminClient } from '@/lib/supabase/server'

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

  // 1. If mock mode is enabled, skip external checks and activate
  if (process.env.MOCK_DNS_VERIFICATION === 'true' || !process.env.CLOUDFLARE_API_TOKEN) {
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

  // 2. Perform DNS validation
  try {
    // Check TXT verification token
    if (domain.verification_token) {
      try {
        const txtRecords = await dnsPromises.resolveTxt(`_leadsmind-verify.${domain.hostname}`)
        const matched = txtRecords.some(record => record.includes(domain.verification_token))
        if (!matched) {
          return { success: false, status: 'verifying', error: 'Verification TXT token not found or incorrect' }
        }
      } catch (e) {
        return { success: false, status: 'verifying', error: 'TXT verification lookup failed' }
      }
    }

    // Check CNAME record targeting domains.leadsmind.com
    try {
      const cnames = await dnsPromises.resolveCname(domain.hostname)
      const target = 'domains.leadsmind.com'
      const hasCname = cnames.some(c => c.toLowerCase() === target)
      if (!hasCname) {
        return { success: false, status: 'verifying', error: `CNAME does not target ${target}` }
      }
    } catch (e) {
      return { success: false, status: 'verifying', error: 'CNAME verification lookup failed' }
    }

    // Advancing status to active
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
    return { success: false, status: 'verifying', error: err.message || 'DNS query failed' }
  }
}
