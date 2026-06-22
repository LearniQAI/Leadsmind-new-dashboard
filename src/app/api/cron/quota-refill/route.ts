import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

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
  try {
    const resetCount = await processQuotaRefill()
    return NextResponse.json({ success: true, resetCount })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const resetCount = await processQuotaRefill()
    return NextResponse.json({ success: true, resetCount })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
