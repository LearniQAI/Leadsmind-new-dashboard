// src/app/api/v1/webhooks/unsubscribe/route.ts
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError, apiData } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function DELETE(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  let body: any = {}
  try {
    body = await req.json()
  } catch {
    // Gracefully fallback to search parameters if JSON parsing fails
  }

  const id = body.id || req.nextUrl.searchParams.get('id')
  if (!id) return apiError('id is required')

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('webhook_subscriptions')
    .delete()
    .eq('workspace_id', auth.workspaceId)
    .eq('id', id)
    .select('id')

  if (error) {
    return apiError('Internal server error', 500)
  }

  return apiData({ success: true, message: 'Unsubscribed successfully' })
}
