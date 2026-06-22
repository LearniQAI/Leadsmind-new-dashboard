import { createAdminClient } from '@/lib/supabase/server'

export function calcCommission(programme: any, amount: number, salesCount = 0): number {
  if (!programme) return 0
  
  let val = Number(programme.commission_value || 0)
  let type = programme.commission_type || 'percentage'

  // Tiered thresholds
  const config = programme.commission_config || {}
  if (config.tiers && Array.isArray(config.tiers)) {
    // Sort tiers descending by min_sales
    const sortedTiers = [...config.tiers].sort((a, b) => b.min_sales - a.min_sales)
    const activeTier = sortedTiers.find(t => salesCount >= t.min_sales)
    if (activeTier) {
      val = Number(activeTier.commission_value)
      if (activeTier.commission_type) {
        type = activeTier.commission_type
      }
    }
  }

  if (type === 'percentage') {
    return Number(((amount * val) / 100).toFixed(2))
  }
  if (type === 'fixed') {
    return Number(val.toFixed(2))
  }
  return 0
}

export async function recordConversion(opts: {
  workspaceId: string
  affiliateId: string
  programmeId: string
  sourceType: 'order' | 'invoice' | 'subscription' | 'signup_bonus' | 'milestone_bonus' | 'competition_bonus'
  sourceId: string
  contactId?: string | null
  amount: number
  ipHash?: string | null
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

  // Fraud detection checks
  let flagged = false
  let flagReason = ''

  // A. Self-referral check: buyer email matches affiliate email
  if (opts.contactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('email')
      .eq('id', opts.contactId)
      .maybeSingle()

    if (contact?.email && affiliate.email && contact.email.trim().toLowerCase() === affiliate.email.trim().toLowerCase()) {
      flagged = true
      flagReason = 'Self-referral detected: buyer email matches affiliate email.'
    }
  }

  // B. High-frequency IP check: more than 3 conversions from same IP hash
  if (opts.ipHash) {
    const { count: ipCount } = await supabase
      .from('affiliate_commissions')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', opts.ipHash)

    if (ipCount && ipCount >= 3) {
      flagged = true
      const reason = `High-frequency IP: ${ipCount} conversions recorded from this IP.`
      flagReason = flagReason ? `${flagReason} | ${reason}` : reason
    }
  }

  // 3. Get existing sales count to evaluate tiered thresholds
  const { count: salesCount } = await supabase
    .from('affiliate_commissions')
    .select('id', { count: 'exact', head: true })
    .eq('affiliate_id', opts.affiliateId)
    .in('status', ['approved', 'paid', 'pending'])
    .eq('tier', 1)

  const currentSalesCount = salesCount || 0

  // 4. Calculate Tier 1 Commission
  const tier1Amount = calcCommission(programme, opts.amount, currentSalesCount)
  if (tier1Amount <= 0) return null

  const holdDays = programme.commission_config?.hold_days ?? 30
  const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000).toISOString()

  // 5. Insert Tier 1 Commission
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
      hold_until: holdUntil,
      ip_hash: opts.ipHash || null,
      flagged,
      flag_reason: flagReason || null
    })
    .select('*')
    .single()

  if (t1Error) {
    console.error('[Affiliate Commission Tier-1 Error]:', t1Error)
    return null
  }

  // 6. Handle Tier 2 (Parent Affiliate)
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
            hold_until: holdUntil,
            ip_hash: opts.ipHash || null,
            flagged,
            flag_reason: flagReason ? `Parent override: ${flagReason}` : null
          })
      }
    }
  }

  // 7. Check and trigger Milestone Bonuses
  const milestones = programme.commission_config?.milestones || []
  const newSalesCount = currentSalesCount + 1
  for (const ms of milestones) {
    if (newSalesCount === Number(ms.sales)) {
      // Check if already awarded
      const { data: alreadyAwarded } = await supabase
        .from('affiliate_commissions')
        .select('id')
        .eq('affiliate_id', opts.affiliateId)
        .eq('source_type', 'milestone_bonus')
        .eq('amount', ms.bonus)
        .maybeSingle()

      if (!alreadyAwarded) {
        await supabase
          .from('affiliate_commissions')
          .insert({
            affiliate_id: opts.affiliateId,
            programme_id: opts.programmeId,
            workspace_id: opts.workspaceId,
            tier: 1,
            source_type: 'milestone_bonus',
            source_id: opts.sourceId,
            amount: ms.bonus,
            currency: programme.currency || 'ZAR',
            status: 'pending',
            hold_until: holdUntil
          })
      }
    }
  }

  // 8. First Commission Notification Email
  if (newSalesCount === 1) {
    try {
      const { sendEmail } = await import('@/lib/email')
      const { getWorkspaceEmailConfig } = await import('@/lib/email/resolveConfig')
      const customConfig = await getWorkspaceEmailConfig(programme.workspace_id)
      
      await sendEmail({
        to: affiliate.email,
        subject: 'Congratulations on your first affiliate commission!',
        html: `
          <div style="font-family:sans-serif;padding:30px;color:#333;line-height:1.6;max-width:500px;margin:0 auto;border:1px solid #eaeaea;border-radius:12px;background:#ffffff;">
            <h2 style="color:#10b981;margin-bottom:15px;">You Made a Sale! 🎉</h2>
            <p>Hi ${affiliate.full_name || 'Partner'},</p>
            <p>We are thrilled to let you know that you have earned your very first commission of <strong>R${tier1Amount}</strong>!</p>
            <p>Keep up the amazing work. You can check your stats and payouts anytime in the affiliate portal.</p>
            <div style="margin:25px 0;text-align:center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/affiliate-portal/login" style="background-color:#10b981;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:bold;display:inline-block;">View Earnings</a>
            </div>
          </div>
        `,
        config: customConfig || undefined
      })
    } catch (e) {
      console.error('[First Commission Email Error]', e)
    }
  }

  return tier1Comm
}
