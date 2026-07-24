import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'tasks')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .maybeSingle()

  if (error) return apiError('Internal server error', 500)
  if (!data) return apiError('Task not found', 404)
  return apiData(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'tasks')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const allowed = [
    'title', 'description', 'assigned_to', 'contact_id', 'related_type', 
    'related_id', 'priority', 'status', 'due_date', 'due_time', 
    'is_recurring', 'recurrence_rule', 'completed_at', 'sort_order'
  ]
  const updates: Record<string, any> = {}
  for (const k of allowed) if (k in body) updates[k] = body[k]

  if (Object.keys(updates).length === 0) return apiError('No updatable fields provided')
  updates.updated_at = new Date().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()

  if (error) return apiError('Internal server error', 500)
  if (!data) return apiError('Task not found', 404)
  return apiData(data)
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'tasks')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)

  if (error) return apiError('Internal server error', 500)
  return apiData({ id: params.id, deleted: true })
}
