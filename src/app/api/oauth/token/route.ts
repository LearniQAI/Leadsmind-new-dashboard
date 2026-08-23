import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// Constant-time shared-secret comparison — same standing rule as every other signature/token
// check in this codebase (webhooks/meta, lib/calendar/payfast, lib/security/unsubscribeToken,
// webhooks/avatar-generator). A plain `===`/`!==` leaks timing information proportional to the
// number of matching leading bytes.
function timingSafeHashEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8')
  const bBuf = Buffer.from(b, 'utf8')
  if (aBuf.length !== bBuf.length) return false
  return timingSafeEqual(aBuf, bBuf)
}

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  // Support both application/x-www-form-urlencoded and application/json
  let body: Record<string, any> = {}
  const contentType = req.headers.get('content-type') || ''
  
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await req.formData()
    formData.forEach((value, key) => {
      body[key] = value
    })
  } else {
    try {
      body = await req.json()
    } catch {
      // Fallback
    }
  }

  const grantType = body.grant_type
  const clientId = body.client_id
  const clientSecret = body.client_secret

  if (!grantType || !clientId || !clientSecret) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'Missing grant_type, client_id, or client_secret' }, { status: 400 })
  }

  const adminSupabase = createAdminClient()
  
  // 1. Authenticate client
  const { data: client, error: clientErr } = await adminSupabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (clientErr || !client) {
    return NextResponse.json({ error: 'invalid_client', error_description: 'Client authentication failed' }, { status: 401 })
  }

  const hashedSecret = createHash('sha256').update(clientSecret).digest('hex')
  if (!timingSafeHashEqual(client.client_secret_hash, hashedSecret)) {
    return NextResponse.json({ error: 'invalid_client', error_description: 'Client authentication failed' }, { status: 401 })
  }

  if (grantType === 'authorization_code') {
    const code = body.code
    const redirectUri = body.redirect_uri

    if (!code) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing authorization code' }, { status: 400 })
    }

    // Fetch and validate authorization code (looked up by hash — see
    // 20260830000000_hash_oauth_tokens.sql)
    const codeHash = createHash('sha256').update(code).digest('hex')
    const { data: codeRow, error: codeErr } = await adminSupabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code_hash', codeHash)
      .eq('client_id', clientId)
      .maybeSingle()

    if (codeErr || !codeRow) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid or expired authorization code' }, { status: 400 })
    }

    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      // Delete expired code
      await adminSupabase.from('oauth_authorization_codes').delete().eq('id', codeRow.id).eq('workspace_id', codeRow.workspace_id)
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Authorization code has expired' }, { status: 400 })
    }

    if (redirectUri && codeRow.redirect_uri !== redirectUri) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Redirect URI mismatch' }, { status: 400 })
    }

    // Delete the code to prevent reuse
    await adminSupabase.from('oauth_authorization_codes').delete().eq('id', codeRow.id).eq('workspace_id', codeRow.workspace_id)

    // Generate tokens. Only their SHA-256 hashes are stored -- the plaintext
    // values are one-time bearer secrets returned to the client below and
    // never need to be read back server-side (same pattern as
    // oauth_clients.client_secret_hash / workspace_api_keys.key_hash).
    const accessToken = 'at_' + randomBytes(32).toString('hex')
    const refreshToken = 'rt_' + randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour

    const { error: tokenErr } = await adminSupabase
      .from('oauth_access_tokens')
      .insert({
        token_hash: createHash('sha256').update(accessToken).digest('hex'),
        refresh_token_hash: createHash('sha256').update(refreshToken).digest('hex'),
        client_id: clientId,
        workspace_id: codeRow.workspace_id,
        user_id: codeRow.user_id,
        scopes: codeRow.scopes,
        expires_at: expiresAt.toISOString()
      })

    if (tokenErr) {
      return NextResponse.json({ error: 'server_error', error_description: tokenErr.message }, { status: 500 })
    }

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: refreshToken,
      scope: codeRow.scopes.join(' ')
    })

  } else if (grantType === 'refresh_token') {
    const refreshToken = body.refresh_token

    if (!refreshToken) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing refresh_token' }, { status: 400 })
    }

    // Fetch active token row matching refresh_token (looked up by hash)
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const { data: tokenRow, error: tokenErr } = await adminSupabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('refresh_token_hash', refreshTokenHash)
      .eq('client_id', clientId)
      .maybeSingle()

    if (tokenErr || !tokenRow) {
      return NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid or expired refresh token' }, { status: 400 })
    }

    // Delete old token
    await adminSupabase.from('oauth_access_tokens').delete().eq('id', tokenRow.id).eq('workspace_id', tokenRow.workspace_id)

    // Generate new tokens
    const newAccessToken = 'at_' + randomBytes(32).toString('hex')
    const newRefreshToken = 'rt_' + randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour

    const { error: insertErr } = await adminSupabase
      .from('oauth_access_tokens')
      .insert({
        token_hash: createHash('sha256').update(newAccessToken).digest('hex'),
        refresh_token_hash: createHash('sha256').update(newRefreshToken).digest('hex'),
        client_id: clientId,
        workspace_id: tokenRow.workspace_id,
        user_id: tokenRow.user_id,
        scopes: tokenRow.scopes,
        expires_at: expiresAt.toISOString()
      })

    if (insertErr) {
      return NextResponse.json({ error: 'server_error', error_description: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({
      access_token: newAccessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: newRefreshToken,
      scope: tokenRow.scopes.join(' ')
    })
  }

  return NextResponse.json({ error: 'unsupported_grant_type', error_description: 'Unsupported grant_type' }, { status: 400 })
}
