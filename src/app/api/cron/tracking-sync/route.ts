import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { syncShipmentTracking } from '@/app/actions/shipments'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient()
  
  const { data: shipments, error } = await supabase
    .from('courier_shipments')
    .select('id')
    .eq('active', true)

  if (error) {
    logger.error({ err: error }, 'cron.tracking_sync.shipments_fetch.failed')
    return NextResponse.json({ error: 'Failed to fetch active shipments.' }, { status: 500 })
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
      logger.error({ err, shipmentId: s.id }, 'cron.tracking_sync.shipment_sync.failed')
      results.push({ id: s.id, success: false, error: 'Sync failed.' })
    }
  }

  return NextResponse.json({ synced: results.length, details: results })
}
