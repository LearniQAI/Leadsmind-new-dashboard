import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createHash, randomBytes } from 'crypto'

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
  if (client.client_secret_hash !== hashedSecret) {
    return NextResponse.json({ error: 'invalid_client', error_description: 'Client authentication failed' }, { status: 401 })
  }

  if (grantType === 'authorization_code') {
    const code = body.code
    const redirectUri = body.redirect_uri

    if (!code) {
      return NextResponse.json({ error: 'invalid_request', error_description: 'Missing authorization code' }, { status: 400 })
    }

    // Fetch and validate authorization code
    const { data: codeRow, error: codeErr } = await adminSupabase
      .from('oauth_authorization_codes')
      .select('*')
      .eq('code', code)
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

    // Generate tokens
    const accessToken = 'at_' + randomBytes(32).toString('hex')
    const refreshToken = 'rt_' + randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 3600 * 1000) // 1 hour

    const { error: tokenErr } = await adminSupabase
      .from('oauth_access_tokens')
      .insert({
        token: accessToken,
        refresh_token: refreshToken,
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

    // Fetch active token row matching refresh_token
    const { data: tokenRow, error: tokenErr } = await adminSupabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('refresh_token', refreshToken)
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
        token: newAccessToken,
        refresh_token: newRefreshToken,
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
