import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/shared/logger'

async function processQuotaRefill() {
  const supabase = createAdminClient()
  const { data: quotas, error } = await supabase
    .from('tracking_quota')
    .select('*')

  if (error) {
    throw new Error(error.message)
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  let resetCount = 0

  for (const q of quotas || []) {
    const periodStart = new Date(q.period_start)
    const diffTime = today.getTime() - periodStart.getTime()
    const diffDays = diffTime / (1000 * 60 * 60 * 24)

    // Reset if 30 days or more have elapsed
    if (diffDays >= 30) {
      const { error: updateErr } = await supabase
        .from('tracking_quota')
        .update({
          used_count: 0,
          period_start: todayStr,
          updated_at: new Date().toISOString()
        })
        .eq('workspace_id', q.workspace_id)
      
      if (!updateErr) {
        resetCount++
      }
    }
  }

  return resetCount
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const resetCount = await processQuotaRefill()
    return NextResponse.json({ success: true, resetCount })
  } catch (err: any) {
    logger.error({ err }, 'cron.quota_refill.failed')
    return NextResponse.json({ success: false, error: 'Quota refill failed.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const resetCount = await processQuotaRefill()
    return NextResponse.json({ success: true, resetCount })
  } catch (err: any) {
    logger.error({ err }, 'cron.quota_refill.failed')
    return NextResponse.json({ success: false, error: 'Quota refill failed.' }, { status: 500 })
  }
}
