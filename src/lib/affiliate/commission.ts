import { createAdminClient } from '@/lib/supabase/server'

export function calcCommission(programme: any, amount: number): number {
  if (!programme) return 0
  if (programme.commission_type === 'percentage') {
    return Number(((amount * Number(programme.commission_value)) / 100).toFixed(2))
  }
  if (programme.commission_type === 'fixed') {
    return Number(Number(programme.commission_value).toFixed(2))
  }
  return 0
}

export async function recordConversion(opts: {
  workspaceId: string
  affiliateId: string
  programmeId: string
  sourceType: 'order' | 'invoice'
  sourceId: string
  contactId?: string | null
  amount: number
}) {
  const supabase = createAdminClient()

  // 1. Fetch programme details
  const { data: programme } = await supabase
    .from('affiliate_programmes')
    .select('*')
    .eq('id', opts.programmeId)
    .maybeSingle()

  if (!programme || programme.status !== 'active') return null

  // 2. Fetch affiliate details
  const { data: affiliate } = await supabase
    .from('affiliates')
    .select('*')
    .eq('id', opts.affiliateId)
    .maybeSingle()

  if (!affiliate || affiliate.status !== 'approved') return null

  // 3. Calculate Tier 1 Commission
  const tier1Amount = calcCommission(programme, opts.amount)
  if (tier1Amount <= 0) return null

  const holdDays = 30 // 30-day standard refund window hold
  const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000).toISOString()

  // Insert Tier 1
  const { data: tier1Comm, error: t1Error } = await supabase
    .from('affiliate_commissions')
    .insert({
      affiliate_id: opts.affiliateId,
      programme_id: opts.programmeId,
      workspace_id: opts.workspaceId,
      tier: 1,
      source_type: opts.sourceType,
      source_id: opts.sourceId,
      contact_id: opts.contactId ?? null,
      amount: tier1Amount,
      currency: programme.currency || 'ZAR',
      status: 'pending',
      hold_until: holdUntil
    })
    .select('*')
    .single()

  if (t1Error) {
    console.error('[Affiliate Commission Tier-1 Error]:', t1Error)
    return null
  }

  // 4. Handle Tier 2 (Parent Affiliate)
  if (programme.two_tier_enabled && affiliate.parent_affiliate_id) {
    const tier2Percent = Number(programme.tier2_override_percent || 0)
    if (tier2Percent > 0) {
      const tier2Amount = Number(((tier1Amount * tier2Percent) / 100).toFixed(2))
      if (tier2Amount > 0) {
        await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_id: affiliate.parent_affiliate_id,
            programme_id: opts.programmeId,
            workspace_id: opts.workspaceId,
            tier: 2,
            source_type: opts.sourceType,
            source_id: opts.sourceId,
            contact_id: opts.contactId ?? null,
            amount: tier2Amount,
            currency: programme.currency || 'ZAR',
            status: 'pending',
            hold_until: holdUntil
          })
      }
    }
  }

  return tier1Comm
}
