import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'tasks')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const priority = sp.get('priority')

  const supabase = createAdminClient()
  let query = supabase
    .from('tasks')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, error, count } = await query
  if (error) return apiError('Internal server error', 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'tasks')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.title) return apiError('title is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    title: body.title,
    description: body.description ?? null,
    assigned_to: body.assigned_to ?? null,
    contact_id: body.contact_id ?? null,
    related_type: body.related_type ?? null,
    related_id: body.related_id ?? null,
    priority: body.priority ?? 'medium',
    status: body.status ?? 'pending',
    due_date: body.due_date ?? null,
    due_time: body.due_time ?? null,
    is_recurring: body.is_recurring ?? false,
    recurrence_rule: body.recurrence_rule ?? null,
    completed_at: body.completed_at ?? null,
    sort_order: body.sort_order ?? 0,
  }

  const { data, error } = await supabase.from('tasks').insert(payload).select('*').single()
  if (error) return apiError('Internal server error', 500)

  return apiData(data, 201)
}
