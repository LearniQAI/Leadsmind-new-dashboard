import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const clientId = sp.get('client_id')
  const redirectUri = sp.get('redirect_uri')
  const scope = sp.get('scope') || ''
  const state = sp.get('state') || ''
  const responseType = sp.get('response_type')

  if (!clientId || !redirectUri || responseType !== 'code') {
    return NextResponse.json({ error: 'invalid_request', error_description: 'Missing client_id, redirect_uri, or response_type must be code' }, { status: 400 })
  }

  // Fetch oauth client
  const adminSupabase = createAdminClient()
  const { data: client, error: clientError } = await adminSupabase
    .from('oauth_clients')
    .select('*')
    .eq('client_id', clientId)
    .maybeSingle()

  if (clientError || !client) {
    return NextResponse.json({ error: 'invalid_client', error_description: 'OAuth client not found' }, { status: 400 })
  }

  // Validate redirect URI
  const registeredUris: string[] = client.redirect_uris || []
  if (!registeredUris.includes(redirectUri)) {
    return NextResponse.json({ error: 'invalid_grant', error_description: 'Redirect URI mismatch' }, { status: 400 })
  }

  // Get active user session
  const userSupabase = await createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()

  if (!user) {
    // Redirect to login page
    const loginUrl = new URL('/login', req.nextUrl.origin)
    loginUrl.searchParams.set('next', req.nextUrl.pathname + req.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Render Premium Glassmorphism Consent Page
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Authorize ${client.name} - LeadsMind</title>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap" rel="stylesheet">
      <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Plus Jakarta Sans', sans-serif;
          background: radial-gradient(circle at top right, #1e1b4b 0%, #0b0f19 70%);
          color: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          overflow: hidden;
        }
        .container {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 40px;
          width: 100%;
          max-width: 440px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
          text-align: center;
        }
        .logo {
          font-family: 'Outfit', sans-serif;
          font-size: 24px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 24px;
          letter-spacing: -0.5px;
        }
        .logo span {
          color: #3b82f6;
        }
        h2 {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 8px;
        }
        p {
          font-size: 14px;
          color: #94a3b8;
          line-height: 1.5;
          margin-bottom: 24px;
        }
        .scopes-box {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 16px;
          text-align: left;
          margin-bottom: 24px;
        }
        .scopes-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #475569;
          margin-bottom: 12px;
        }
        .scope-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: #cbd5e1;
          margin-bottom: 8px;
        }
        .scope-item:last-child {
          margin-bottom: 0;
        }
        .scope-item i {
          color: #10b981;
          font-size: 12px;
        }
        .btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: #2563eb;
          color: white;
          margin-bottom: 12px;
        }
        .btn-primary:hover {
          background: #1d4ed8;
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">Leads<span>Mind</span></div>
        <h2>Authorize ${client.name}</h2>
        <p>This application is requesting permissions to access resources in your active workspace.</p>
        
        <div class="scopes-box">
          <div class="scopes-title">Requested Scopes</div>
          <div class="scope-item">
            <i>✓</i> Read and write access to scope: <strong>${scope || 'default'}</strong>
          </div>
          <div class="scope-item">
            <i>✓</i> Access to active workspace resources
          </div>
        </div>

        <form action="/api/oauth/authorize" method="POST">
          <input type="hidden" name="client_id" value="${clientId}">
          <input type="hidden" name="redirect_uri" value="${redirectUri}">
          <input type="hidden" name="scope" value="${scope}">
          <input type="hidden" name="state" value="${state}">
          <input type="hidden" name="workspace_id" value="${client.workspace_id}">
          <button type="submit" class="btn btn-primary">Authorize Access</button>
          <button type="button" class="btn btn-secondary" onclick="window.history.back()">Cancel</button>
        </form>
      </div>
    </body>
    </html>
  `

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' }
  })
}

export async function POST(req: NextRequest) {
  // Check active user session
  const userSupabase = await createServerClient()
  const { data: { user } } = await userSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthorized', error_description: 'User must be authenticated' }, { status: 401 })
  }

  // Parse form body
  const formData = await req.formData()
  const clientId = formData.get('client_id') as string
  const redirectUri = formData.get('redirect_uri') as string
  const scope = formData.get('scope') as string
  const state = formData.get('state') as string
  const workspaceId = formData.get('workspace_id') as string

  if (!clientId || !redirectUri || !workspaceId) {
    return NextResponse.json({ error: 'invalid_request', error_description: 'Missing required authorization parameters' }, { status: 400 })
  }

  // Generate auth code
  const code = 'ac_' + randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

  const adminSupabase = createAdminClient()
  const { error } = await adminSupabase
    .from('oauth_authorization_codes')
    .insert({
      code,
      client_id: clientId,
      workspace_id: workspaceId,
      user_id: user.id,
      redirect_uri: redirectUri,
      scopes: scope ? scope.split(' ') : ['default'],
      expires_at: expiresAt.toISOString()
    })

  if (error) {
    return NextResponse.json({ error: 'server_error', error_description: error.message }, { status: 500 })
  }

  // Redirect to redirectUri with code and state
  const targetUrl = new URL(redirectUri)
  targetUrl.searchParams.set('code', code)
  if (state) targetUrl.searchParams.set('state', state)

  return NextResponse.redirect(targetUrl.toString())
}
