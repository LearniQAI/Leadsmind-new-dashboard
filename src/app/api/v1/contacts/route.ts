// src/app/api/v1/contacts/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatcher'

export const dynamic = 'force-dynamic'

// GET /api/v1/contacts?limit=&offset=&email=&q=&tag=
export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const email = sp.get('email')
  const q = sp.get('q')
  const tag = sp.get('tag')

  const supabase = createAdminClient()
  let query = supabase
    .from('contacts')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (email) query = query.eq('email', email.toLowerCase())
  if (tag) query = query.contains('tags', [tag])
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)

  const { data, error, count } = await query
  if (error) return apiError(error.message, 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

// POST /api/v1/contacts
export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  const email = (body.email || '').trim().toLowerCase()
  if (!email) return apiError('email is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    email,
    first_name: body.first_name ?? null,
    last_name: body.last_name ?? null,
    phone: body.phone ?? null,
    source: body.source ?? 'api',
    tags: Array.isArray(body.tags) ? body.tags : [],
    metadata: body.metadata ?? {},
  }

  // Insert first so we can distinguish created vs updated for the webhook event.
  const insertRes = await supabase.from('contacts').insert(payload).select('*').single()

  if (!insertRes.error && insertRes.data) {
    await dispatchWebhook(auth.workspaceId, 'contact.created', { contact: insertRes.data })
    return apiData(insertRes.data, 201)
  }

  // Unique violation on (workspace_id, email) -> update existing
  if (insertRes.error && insertRes.error.code === '23505') {
    const { data: updated, error: upErr } = await supabase
      .from('contacts')
      .update({
        first_name: payload.first_name,
        last_name: payload.last_name,
        phone: payload.phone,
        tags: payload.tags,
        metadata: payload.metadata,
      })
      .eq('workspace_id', auth.workspaceId)
      .eq('email', email)
      .select('*')
      .single()
    if (upErr) return apiError(upErr.message, 500)
    await dispatchWebhook(auth.workspaceId, 'contact.updated', { contact: updated })
    return apiData(updated, 200)
  }

  return apiError(insertRes.error?.message ?? 'Failed to create contact', 500)
}
