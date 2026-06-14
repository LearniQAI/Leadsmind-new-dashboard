// src/lib/api/auth.ts
// Unified public-API auth + response helpers for /api/v1/*.
// Validates lm_live_ / lm_test_ keys against workspace_api_keys (SHA-256 hashed),
// with a backward-compatible fallback to the legacy workspaces.api_key column.

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

export type ApiAuth = {
  ok: boolean
  workspaceId: string
  keyId: string | null
  status: number
  error: string
}

/** Pull the key from Authorization: Bearer, X-API-Key, or X-LeadsMind-Key. */
function extractKey(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7).trim()
  }
  return req.headers.get('x-api-key') || req.headers.get('x-leadsmind-key') || null
}

/**
 * Validate an inbound API key and resolve it to a workspace.
 * Order: 1) hashed lookup in workspace_api_keys  2) legacy raw workspaces.api_key
 */
export async function validateApiKey(req: NextRequest): Promise<ApiAuth> {
  const raw = extractKey(req)
  if (!raw) return { ok: false, workspaceId: '', keyId: null, status: 401, error: 'Missing API key' }

  const supabase = createAdminClient()
  const keyHash = createHash('sha256').update(raw).digest('hex')

  // 1) Modern hashed key
  const { data: keyRow } = await supabase
    .from('workspace_api_keys')
    .select('id, workspace_id, revoked')
    .eq('key_hash', keyHash)
    .eq('revoked', false)
    .maybeSingle()

  if (keyRow) {
    // Best-effort usage stamp — never block the request on this.
    supabase
      .from('workspace_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyRow.id)
      .then(() => {}, () => {})
    return { ok: true, workspaceId: keyRow.workspace_id, keyId: keyRow.id, status: 200, error: '' }
  }

  // 2) Legacy fallback (raw key stored on workspaces.api_key)
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('api_key', raw)
    .maybeSingle()

  if (ws) return { ok: true, workspaceId: ws.id, keyId: null, status: 200, error: '' }

  return { ok: false, workspaceId: '', keyId: null, status: 401, error: 'Invalid API key' }
}

/** Standard error envelope. */
export function apiError(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

/** Standard success envelope. */
export function apiData(
  data: unknown,
  status = 200,
  extra?: Record<string, unknown>
) {
  return NextResponse.json({ data, ...(extra ?? {}) }, { status })
}

/** limit (1–100, default 50) + offset (>=0). */
export function parsePagination(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const limit = Math.min(Math.max(parseInt(sp.get('limit') || '50', 10) || 50, 1), 100)
  const offset = Math.max(parseInt(sp.get('offset') || '0', 10) || 0, 0)
  return { limit, offset }
}
