import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'pipelines')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const pipelineId = sp.get('pipeline_id')

  const supabase = createAdminClient()
  let query = supabase
    .from('pipeline_stages')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('position', { ascending: true })
    .range(offset, offset + limit - 1)

  if (pipelineId) query = query.eq('pipeline_id', pipelineId)

  const { data, error, count } = await query
  if (error) return apiError('Internal server error', 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'pipelines')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.pipeline_id) return apiError('pipeline_id is required')
  if (!body.name) return apiError('name is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    pipeline_id: body.pipeline_id,
    name: body.name,
    position: body.position ?? 0,
  }

  const { data, error } = await supabase.from('pipeline_stages').insert(payload).select('*').single()
  if (error) return apiError('Internal server error', 500)

  return apiData(data, 201)
}
