import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'pipelines')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)

  const supabase = createAdminClient()
  const { data, error, count } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return apiError(error.message, 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'pipelines')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.name) return apiError('name is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    name: body.name,
    is_default: body.is_default ?? false,
  }

  const { data, error } = await supabase.from('pipelines').insert(payload).select('*').single()
  if (error) return apiError(error.message, 500)

  return apiData(data, 201)
}
