import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient()

    // 1. Fetch all recurring commissions that are Tier 1 (parent overrides are generated alongside them)
    const { data: commissions, error: fetchErr } = await supabase
      .from('affiliate_commissions')
      .select('*, programme:affiliate_programmes(*), affiliate:affiliates(*)')
      .not('recurring_month', 'is', null)
      .eq('tier', 1)
      .order('created_at', { ascending: false })

    if (fetchErr) {
      return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    }

    // Group by (affiliate_id, programme_id, source_id, source_type) to find the latest monthly entry
    const latestMap = new Map<string, any>()
    for (const comm of (commissions || [])) {
      const uniqueKey = `${comm.affiliate_id}:${comm.programme_id}:${comm.source_id}:${comm.source_type}`
      if (!latestMap.has(uniqueKey)) {
        latestMap.set(uniqueKey, comm)
      } else {
        const existing = latestMap.get(uniqueKey)
        if (comm.recurring_month > existing.recurring_month) {
          latestMap.set(uniqueKey, comm)
        }
      }
    }

    const processed = []

    for (const comm of latestMap.values()) {
      // Check if program is still active and affiliate is approved
      if (comm.programme?.status !== 'active' || comm.affiliate?.status !== 'approved') {
        continue
      }

      // Check if at least 28 days have passed since the last recurring commission
      const lastCreated = new Date(comm.created_at)
      const daysPassed = (Date.now() - lastCreated.getTime()) / (1000 * 60 * 60 * 24)
      if (daysPassed < 28) {
        continue
      }

      // Check if subscription/enrollment is still active
      let isSubscriptionActive = false

      if (comm.source_type === 'subscription') {
        // Workspace plan tier
        const { data: ws } = await supabase
          .from('workspaces')
          .select('plan_tier, stripe_subscription_id')
          .eq('id', comm.workspace_id)
          .maybeSingle()
        isSubscriptionActive = !!(ws && ws.plan_tier !== 'free' && ws.stripe_subscription_id)
      } else if (comm.source_type === 'enrollment' || (comm.source_type === 'order' && comm.source_id)) {
        // Course enrollment check
        const { data: enroll } = await supabase
          .from('enrollments')
          .select('active, subscription_ends_at')
          .eq('id', comm.source_id)
          .maybeSingle()
        
        if (enroll) {
          isSubscriptionActive = enroll.active && (!enroll.subscription_ends_at || new Date(enroll.subscription_ends_at) > new Date())
        } else {
          isSubscriptionActive = true // fallback
        }
      } else {
        isSubscriptionActive = true // fallback
      }

      if (!isSubscriptionActive) continue

      // Create next monthly commission
      const nextMonth = comm.recurring_month + 1
      const holdDays = comm.programme?.commission_config?.hold_days ?? 30
      const holdUntil = new Date(Date.now() + holdDays * 24 * 60 * 60 * 1000).toISOString()

      // Insert Tier 1 next month
      const { data: nextComm, error: insErr } = await supabase
        .from('affiliate_commissions')
        .insert({
          affiliate_id: comm.affiliate_id,
          programme_id: comm.programme_id,
          workspace_id: comm.workspace_id,
          tier: 1,
          source_type: comm.source_type,
          source_id: comm.source_id,
          contact_id: comm.contact_id || null,
          amount: comm.amount,
          currency: comm.currency || 'ZAR',
          status: 'pending',
          recurring_month: nextMonth,
          hold_until: holdUntil
        })
        .select('*')
        .single()

      if (insErr) {
        console.error('[Affiliate Recurring Cron] Insert Error:', insErr)
        continue
      }

      // Handle Tier 2 next month (parent override)
      if (comm.programme?.two_tier_enabled && comm.affiliate?.parent_affiliate_id) {
        const tier2Percent = Number(comm.programme.tier2_override_percent || 0)
        if (tier2Percent > 0) {
          const tier2Amount = Number(((comm.amount * tier2Percent) / 100).toFixed(2))
          if (tier2Amount > 0) {
            await supabase
              .from('affiliate_commissions')
              .insert({
                affiliate_id: comm.affiliate.parent_affiliate_id,
                programme_id: comm.programme_id,
                workspace_id: comm.workspace_id,
                tier: 2,
                source_type: comm.source_type,
                source_id: comm.source_id,
                contact_id: comm.contact_id || null,
                amount: tier2Amount,
                currency: comm.currency || 'ZAR',
                status: 'pending',
                recurring_month: nextMonth,
                hold_until: holdUntil
              })
          }
        }
      }

      processed.push({
        affiliate_id: comm.affiliate_id,
        source_id: comm.source_id,
        next_month: nextMonth
      })
    }

    return NextResponse.json({
      success: true,
      processed_count: processed.length,
      processed
    })
  } catch (err: any) {
    console.error('[Affiliate Recurring Cron Error]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  return GET(req)
}
