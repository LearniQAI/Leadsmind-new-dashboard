import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { encrypt } from '@/lib/encryption'
import { toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

// Attaching/viewing/removing real bank API credentials is at least as sensitive as minting
// an API key or editing billing settings — same admin/owner restriction used there.
const ALLOWED_FINANCE_ROLES = ['admin', 'owner'];

const INVESTEC_BASE = 'https://openapi.investec.com'
const INVESTEC_TOKEN_URL = `${INVESTEC_BASE}/identity/v2/oauth2/token`

// GET — fetch connected Investec accounts for the caller's own workspace
export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('bank_connections')
      .select('id, bank_name, account_name, account_type, account_number_last4, balance, currency, status, last_synced_at')
      .eq('workspace_id', workspaceId)
      .eq('bank_name', 'Investec')

    if (error) throw error;
    return NextResponse.json({ connections: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'finance.investec.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// POST — connect Investec with client credentials, into the caller's own workspace
export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const { clientId, clientSecret, apiKey } = await req.json()
    if (!clientId || !clientSecret || !apiKey) {
      return NextResponse.json({ error: 'clientId, clientSecret and apiKey are required' }, { status: 400 })
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

    const { error: upsertError } = await adminClient
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
    logger.error({ err }, 'finance.investec.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

// DELETE — disconnect Investec from the caller's own workspace
export async function DELETE(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_FINANCE_ROLES);
    const adminClient = createAdminClient();

    const { error } = await adminClient
      .from('bank_connections')
      .update({ status: 'disconnected', updated_at: new Date().toISOString() })
      .eq('workspace_id', workspaceId)
      .eq('bank_name', 'Investec')

    if (error) throw error;
    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'finance.investec.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
