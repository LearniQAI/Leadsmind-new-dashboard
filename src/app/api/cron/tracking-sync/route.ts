import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncShipmentTracking } from '@/app/actions/shipments'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  
  const { data: shipments, error } = await supabase
    .from('courier_shipments')
    .select('id')
    .eq('active', true)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!shipments || shipments.length === 0) {
    return NextResponse.json({ message: 'No active shipments to sync' })
  }

  const results = []
  for (const s of shipments) {
    try {
      const res = await syncShipmentTracking(s.id)
      results.push({ id: s.id, success: res.success, error: res.error || null })
    } catch (err: any) {
      results.push({ id: s.id, success: false, error: err.message })
    }
  }

  return NextResponse.json({ synced: results.length, details: results })
}
