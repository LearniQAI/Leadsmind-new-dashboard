import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'forms')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const status = sp.get('status')
  const type = sp.get('type')

  const supabase = createAdminClient()
  let query = supabase
    .from('forms')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (type) query = query.eq('type', type)

  const { data, error, count } = await query
  if (error) return apiError(error.message, 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'forms')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.name) return apiError('name is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    name: body.name,
    description: body.description ?? null,
    fields: body.fields ?? [],
    success_message: body.success_message ?? 'Form submitted successfully!',
    redirect_url: body.redirect_url ?? null,
    button_text: body.button_text ?? 'Submit',
    theme_color: body.theme_color ?? '#3b82f6',
    slug: body.slug ?? body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    type: body.type ?? 'lead_capture',
    settings: body.settings ?? {},
    status: body.status ?? 'draft',
    config: body.config ?? {},
  }

  const { data, error } = await supabase.from('forms').insert(payload).select('*').single()
  if (error) return apiError(error.message, 500)

  return apiData(data, 201)
}
