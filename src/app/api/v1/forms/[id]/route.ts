import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'forms')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('forms')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .maybeSingle()

  if (error) return apiError('Internal server error', 500)
  if (!data) return apiError('Form not found', 404)
  return apiData(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'forms')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const allowed = [
    'name', 'description', 'fields', 'success_message', 'redirect_url', 
    'button_text', 'theme_color', 'slug', 'type', 'settings', 
    'status', 'config'
  ]
  const updates: Record<string, any> = {}
  for (const k of allowed) if (k in body) updates[k] = body[k]

  if (Object.keys(updates).length === 0) return apiError('No updatable fields provided')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('forms')
    .update(updates)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()

  if (error) return apiError('Internal server error', 500)
  if (!data) return apiError('Form not found', 404)
  return apiData(data)
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx)
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req, 'forms')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('forms')
    .delete()
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)

  if (error) return apiError('Internal server error', 500)
  return apiData({ id: params.id, deleted: true })
}
