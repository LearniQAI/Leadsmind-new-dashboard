import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'tags')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)

  const supabase = createAdminClient()
  const { data, error, count } = await supabase
    .from('contact_tags_registry')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return apiError(error.message, 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'tags')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.name) return apiError('name is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    name: body.name.trim(),
    color: body.color ?? '#3b82f6',
  }

  const { data, error } = await supabase.from('contact_tags_registry').insert(payload).select('*').single()
  if (error) {
    if (error.code === '23505') return apiError('Tag already exists', 409)
    return apiError(error.message, 500)
  }

  return apiData(data, 201)
}
