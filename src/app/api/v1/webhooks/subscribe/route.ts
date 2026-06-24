// src/app/api/v1/webhooks/subscribe/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON body')
  }

  const { event, target_url } = body
  if (!event) return apiError('event is required')
  if (!target_url) return apiError('target_url is required')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .insert({
      workspace_id: auth.workspaceId,
      event,
      target_url
    })
    .select('id')
    .single()

  if (error) {
    return apiError(error.message, 500)
  }

  return apiData({ id: data.id }, 201)
}
