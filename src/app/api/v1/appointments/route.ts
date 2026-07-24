import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData, parsePagination } from '@/lib/api/auth'
import { isSlotConflictError, SLOT_CONFLICT_MESSAGE } from '@/lib/calendar/bookingErrors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req, 'appointments')
  if (!auth.ok) return apiError(auth.error, auth.status)

  const { limit, offset } = parsePagination(req)
  const sp = req.nextUrl.searchParams
  const contactId = sp.get('contact_id')
  const status = sp.get('status')

  const supabase = createAdminClient()
  let query = supabase
    .from('appointments')
    .select('*', { count: 'exact' })
    .eq('workspace_id', auth.workspaceId)
    .order('start_time', { ascending: true })
    .range(offset, offset + limit - 1)

  if (contactId) query = query.eq('contact_id', contactId)
  if (status) query = query.eq('status', status)

  const { data, error, count } = await query
  if (error) return apiError('Internal server error', 500)

  return apiData(data ?? [], 200, { pagination: { limit, offset, total: count ?? 0 } })
}

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req, 'appointments')
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try { body = await req.json() } catch { return apiError('Invalid JSON body') }

  if (!body.title) return apiError('title is required')
  if (!body.start_time) return apiError('start_time is required')
  if (!body.end_time) return apiError('end_time is required')

  const supabase = createAdminClient()
  const payload = {
    workspace_id: auth.workspaceId,
    contact_id: body.contact_id ?? null,
    title: body.title,
    start_time: body.start_time,
    end_time: body.end_time,
    status: body.status ?? 'scheduled',
    created_by: body.created_by ?? null,
    calendar_id: body.calendar_id ?? null,
    deal_id: body.deal_id ?? null,
    metadata: body.metadata ?? {},
    outcome_id: body.outcome_id ?? null,
    max_attendees: body.max_attendees ?? 1,
    current_attendee_count: body.current_attendee_count ?? 0,
    waitlist_enabled: body.waitlist_enabled ?? false,
    host_id: body.host_id ?? null,
    buffer_before_applied: body.buffer_before_applied ?? 0,
    buffer_after_applied: body.buffer_after_applied ?? 0,
    meeting_link: body.meeting_link ?? null,
    user_id: body.user_id ?? null,
    meeting_mode: body.meeting_mode ?? 'virtual',
  }

  const { data, error } = await supabase.from('appointments').insert(payload).select('*').single()
  if (error) {
    // This endpoint had no server-side slot-conflict check at all before —
    // the `appointments_no_overlap` EXCLUDE constraint is what actually
    // catches an overlapping booking here; surface it as a normal 409
    // instead of a raw 500 database error.
    if (isSlotConflictError(error)) return apiError(SLOT_CONFLICT_MESSAGE, 409)
    return apiError('Internal server error', 500)
  }

  return apiData(data, 201)
}
