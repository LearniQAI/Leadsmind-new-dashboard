// src/app/api/v1/me/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey, apiError } from '@/lib/api/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await validateApiKey(req)
  if (!auth.ok) return apiError(auth.error, auth.status)

  const supabase = createAdminClient()
  const { data: ws, error } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', auth.workspaceId)
    .maybeSingle()

  if (error || !ws) {
    return apiError(error?.message || 'Workspace not found', 404)
  }

  // Support both direct root keys and wrapped "data" key for maximum compatibility with Zapier
  return NextResponse.json({
    workspace_id: auth.workspaceId,
    workspace_name: ws.name,
    data: {
      workspace_id: auth.workspaceId,
      workspace_name: ws.name
    }
  })
}
