import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'
import { cookies, headers } from 'next/headers'

export interface AttributionResult {
  affiliateId: string | null
  programmeId: string | null
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + '|lm_salt').digest('hex')
}

export async function resolveAttribution(
  req?: NextRequest | null,
  email?: string | null
): Promise<AttributionResult> {
  const supabase = createAdminClient()

  // 1) Cookie lm_ref
  let cookieVal: string | undefined
  if (req) {
    cookieVal = req.cookies.get('lm_ref')?.value
  } else {
    try {
      cookieVal = cookies().get('lm_ref')?.value
    } catch (e) {}
  }

  if (cookieVal) {
    try {
      const parsed = JSON.parse(cookieVal)
      if (parsed.affiliate_id && parsed.programme_id) {
        return { affiliateId: parsed.affiliate_id, programmeId: parsed.programme_id }
      }
    } catch (e) {}
  }

  // 2) URL ref query parameter
  if (req) {
    const ref = req.nextUrl.searchParams.get('ref')
    if (ref) {
      const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, programme_id')
        .eq('short_code', ref)
        .eq('status', 'approved')
        .maybeSingle()
      if (affiliate) {
        return { affiliateId: affiliate.id, programmeId: affiliate.programme_id }
      }
    }
  }

  // 3) IP Hash match (most recent unique click from same IP hash in last 30 days)
  let ip = '127.0.0.1'
  if (req) {
    ip = req.headers.get('x-forwarded-for') || req.ip || '127.0.0.1'
  } else {
    try {
      const reqHeaders = headers()
      ip = reqHeaders.get('x-forwarded-for') || '127.0.0.1'
    } catch (e) {}
  }
  const ipHash = hashIp(ip.split(',')[0].trim())
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recentClick } = await supabase
    .from('affiliate_clicks')
    .select('affiliate_id, programme_id')
    .eq('ip_hash', ipHash)
    .gt('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (recentClick) {
    return { affiliateId: recentClick.affiliate_id, programmeId: recentClick.programme_id }
  }

  return { affiliateId: null, programmeId: null }
}
