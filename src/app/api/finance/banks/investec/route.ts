import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { encrypt, decrypt } from '@/lib/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const INVESTEC_BASE = 'https://openapi.investec.com'
const INVESTEC_TOKEN_URL = `${INVESTEC_BASE}/identity/v2/oauth2/token`

// GET — fetch connected Investec accounts for workspace
export async function GET(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  const { data, error } = await supabase
    .from('bank_connections')
    .select('id, bank_name, account_name, account_type, account_number_last4, balance, currency, status, last_synced_at')
    .eq('workspace_id', workspaceId)
    .eq('bank_name', 'Investec')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ connections: data ?? [] })
}

// POST — connect Investec with client credentials
export async function POST(req: NextRequest) {
  try {
    const { workspaceId, clientId, clientSecret, apiKey } = await req.json()
    if (!workspaceId || !clientId || !clientSecret || !apiKey) {
      return NextResponse.json({ error: 'workspaceId, clientId, clientSecret and apiKey are required' }, { status: 400 })
    }

    // Step 1: Get access token from Investec
    const tokenRes = await fetch(INVESTEC_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'x-api-key': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: 'grant_type=client_credentials',
    })

    const tokenData = await tokenRes.json()

    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.json({
        error: 'Invalid Investec credentials. Please check your Client ID, Client Secret, and API Key.'
      }, { status: 401 })
    }

    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in ?? 1799

    // Step 2: Fetch accounts from Investec
    // Try private banking first, then business banking
    let accounts: any[] = []
    
    for (const accountType of ['pb', 'bb']) {
      const accountsRes = await fetch(
        `${INVESTEC_BASE}/za/${accountType}/v1/accounts`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-api-key': apiKey,
            'Accept': 'application/json',
          },
        }
      )
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        const fetched = accountsData.data?.accounts ?? []
        if (fetched.length > 0) {
          accounts = fetched.map((a: any) => ({ ...a, accountType }))
          break
        }
      }
    }

    if (accounts.length === 0) {
      return NextResponse.json({
        error: 'No accounts found on this Investec profile. Make sure API access is enabled.'
      }, { status: 404 })
    }

    const primaryAccount = accounts[0]
    const accountNumber = primaryAccount.accountNumber ?? ''
    const last4 = accountNumber.slice(-4)

    // Step 3: Fetch balance
    let balance = 0
    const accountType = primaryAccount.accountType ?? 'pb'
    const balanceRes = await fetch(
      `${INVESTEC_BASE}/za/${accountType}/v1/accounts/${primaryAccount.accountId}/balance`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      }
    )
    if (balanceRes.ok) {
      const balanceData = await balanceRes.json()
      balance = balanceData.data?.currentBalance ?? 0
    }

    // Step 4: Save to database
    const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

    const { error: upsertError } = await supabase
      .from('bank_connections')
      .upsert({
        workspace_id: workspaceId,
        bank_name: 'Investec',
        connection_type: 'investec_oauth',
        client_id: clientId,
        client_secret_encrypted: encrypt(clientSecret),
        api_key_encrypted: encrypt(apiKey),
        access_token_encrypted: encrypt(accessToken),
        token_expires_at: tokenExpiresAt,
        account_id: primaryAccount.accountId,
        account_name: primaryAccount.productName ?? 'Investec Account',
        account_type: accountType === 'pb' ? 'Private Banking' : 'Business Banking',
        account_number_last4: last4,
        balance,
        currency: 'ZAR',
        status: 'active',
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,bank_name' })

    if (upsertError) throw upsertError

    return NextResponse.json({
      success: true,
      accountName: primaryAccount.productName ?? 'Investec Account',
      balance,
      last4,
    })

  } catch (err: any) {
    console.error('[investec-connect]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE — disconnect Investec
export async function DELETE(req: NextRequest) {
  const workspaceId = req.nextUrl.searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
  }
  const { error } = await supabase
    .from('bank_connections')
    .update({ status: 'disconnected', updated_at: new Date().toISOString() })
    .eq('workspace_id', workspaceId)
    .eq('bank_name', 'Investec')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
