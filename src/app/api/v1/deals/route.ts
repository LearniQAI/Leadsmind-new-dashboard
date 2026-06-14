// src/app/api/v1/deals/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export const dynamic = 'force-dynamic'

// GET /api/v1/deals?status=&stage_id=&limit=&offset=
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const stageId = sp.get('stage_id')

  const supabase = createAdminClient()
  let query = supabase
    .from('opportunities')
    .select('*, contact:contacts(id, first_name, last_name, email)', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (stageId) query = query.eq('stage_id', stageId)

  const { data, error, count } = await query
  if (error) return apiError(error.message, 500)
  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

// POST /api/v1/deals
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const title = body.title || body.name
  if (!title) return apiError('title is required')

  const supabase = createAdminClient()

  // Resolve stage: explicit stage_id, else first stage of the workspace's pipeline.
  let stageId: string | null = body.stage_id ?? null
  if (!stageId) {
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('workspace_id', auth.workspaceId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()
    stageId = stage?.id ?? null
  }
  if (!stageId) {
    return apiError('No stage_id provided and no pipeline stages exist for this workspace', 422)
  }

  const payload = {
    workspace_id: auth.workspaceId,
    contact_id: body.contact_id ?? null,
    stage_id: stageId,
    title,
    value: typeof body.value === 'number' ? body.value : 0,
    currency: body.currency ?? 'ZAR',
    status: body.status ?? 'open',
    position: typeof body.position === 'number' ? body.position : 0,
  }

  const { data, error } = await supabase.from('opportunities').insert(payload).select('*').single()
  if (error) return apiError(error.message, 500)
  await dispatchWebhook(auth.workspaceId, 'deal.created', { deal: data })
  return apiData(data, 201)
}
