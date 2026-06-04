import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/encryption'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { workspaceId } = await req.json()
    if (!workspaceId) {
      return NextResponse.json({ error: 'workspaceId required' }, { status: 400 })
    }

    // Fetch the stored connection
    const { data: connection, error: connError } = await supabase
      .from('bank_connections')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('bank_name', 'Investec')
      .eq('status', 'active')
      .single()

    if (connError || !connection) {
      return NextResponse.json({ error: 'No active Investec connection found' }, { status: 404 })
    }

    const accessToken = decrypt(connection.access_token_encrypted)
    const apiKey = decrypt(connection.api_key_encrypted)
    const accountType = connection.account_type === 'Business Banking' ? 'bb' : 'pb'

    // Fetch transactions from last 30 days
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)
    const fromDateStr = fromDate.toISOString().split('T')[0]

    const txRes = await fetch(
      `https://openapi.investec.com/za/${accountType}/v1/accounts/${connection.account_id}/transactions?fromDate=${fromDateStr}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      }
    )

    if (!txRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch transactions from Investec' }, { status: 502 })
    }

    const txData = await txRes.json()
    const transactions = txData.data?.transactions ?? []

    // Save new transactions to accounting_transactions
    let imported = 0
    for (const tx of transactions) {
      const amount = tx.type === 'CREDIT' ? Math.abs(tx.amount) : -Math.abs(tx.amount)
      const externalId = tx.transactionId ?? tx.id

      // Check if already imported
      const { data: existing } = await supabase
        .from('accounting_transactions')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('reference', externalId)
        .single()

      if (!existing) {
        await supabase.from('accounting_transactions').insert({
          workspace_id: workspaceId,
          date: tx.valueDate?.split('T')[0] ?? new Date().toISOString().split('T')[0],
          description: tx.description ?? 'Investec Transaction',
          reference: externalId,
          source_type: 'bank_feed',
          total_amount: amount,
          currency: 'ZAR',
        })
        imported++
      }
    }

    // Update balance and last synced
    const balanceRes = await fetch(
      `https://openapi.investec.com/za/${accountType}/v1/accounts/${connection.account_id}/balance`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': apiKey,
        },
      }
    )
    if (balanceRes.ok) {
      const balanceData = await balanceRes.json()
      const newBalance = balanceData.data?.currentBalance ?? connection.balance
      await supabase
        .from('bank_connections')
        .update({ balance: newBalance, last_synced_at: new Date().toISOString() })
        .eq('id', connection.id)
    }

    return NextResponse.json({ success: true, imported, total: transactions.length })

  } catch (err: any) {
    console.error('[investec-sync]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
