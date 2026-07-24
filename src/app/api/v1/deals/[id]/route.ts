// src/app/api/v1/deals/[id]/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData } from '@/lib/api/auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, contact:contacts(id, first_name, last_name, email)')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .maybeSingle()

  if (error) return apiError('Internal server error', 500)
  if (!data) return apiError('Deal not found', 404)
  return apiData(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const supabase = createAdminClient()
  const { data: current, error: curErr } = await supabase
    .from('opportunities')
    .select('*')
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .maybeSingle()

  if (curErr) return apiError(curErr.message, 500)
  if (!current) return apiError('Deal not found', 404)

  const allowed = ['title', 'name', 'value', 'currency', 'status', 'stage_id', 'contact_id', 'position']
  const updates: Record<string, any> = {}
  for (const k of allowed) if (k in body) updates[k] = body[k]
  if (Object.keys(updates).length === 0) return apiError('No updatable fields provided')

  if (updates.stage_id) {
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('id')
      .eq('id', updates.stage_id)
      .eq('workspace_id', auth.workspaceId)
      .maybeSingle()
    if (!stage) return apiError('stage_id does not belong to this workspace', 422)
  }

  const { data: updated, error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('workspace_id', auth.workspaceId)
    .eq('id', params.id)
    .select('*')
    .single()
  if (error) return apiError('Internal server error', 500)

  // Fire transition events
  const events: Promise<unknown>[] = []
  if ('stage_id' in updates && updates.stage_id !== current.stage_id) {
    events.push(dispatchWebhook(auth.workspaceId, 'deal.stage_changed', {
      deal: updated,
      previous_stage_id: current.stage_id,
      new_stage_id: updates.stage_id,
    }))
  }
  if ('status' in updates && updates.status !== current.status) {
    if (updates.status === 'won') events.push(dispatchWebhook(auth.workspaceId, 'deal.won', { deal: updated }))
    else if (updates.status === 'lost') events.push(dispatchWebhook(auth.workspaceId, 'deal.lost', { deal: updated }))
  }
  await Promise.all(events)
  return apiData(updated)
}

export async function PUT(req: NextRequest, ctx: { params: { id: string } }) {
  return PATCH(req, ctx)
}
