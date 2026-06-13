import { createAdminClient } from '@/lib/supabase/server';

/**
 * Automatically logs double-entry journal entries and transactions for a successful payment.
 */
export async function logRevenueToAccounting(
  invoiceId: string,
  amount: number,
  workspaceId: string,
  paymentRef: string,
  feeStr?: string
): Promise<void> {
  const supabase = createAdminClient();

  try {
    // 1. Resolve Invoice Details
    const { data: invoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .eq('id', invoiceId)
      .single();

    const invoiceNum = invoice?.invoice_number || invoiceId;

    // 2. Fetch or create ledger account IDs
    // Debit Account: Asset (Bank / PayFast Clearing)
    const bankAccountId = await getOrCreateAccount(supabase, workspaceId, '1000', 'Bank / PayFast Clearing', 'asset');
    // Credit Account: Revenue (Consultation Fee / Sales Revenue)
    const revenueAccountId = await getOrCreateAccount(supabase, workspaceId, '4000', 'Consultation Fee Revenue', 'revenue');

    if (!bankAccountId || !revenueAccountId) {
      console.error('[accounting] Could not resolve core accounting accounts. Aborting ledger logs.');
      return;
    }

    // 3. Create parent transaction in public.accounting_transactions
    const { data: transaction, error: txError } = await supabase
      .from('accounting_transactions')
      .insert({
        workspace_id: workspaceId,
        date: new Date().toISOString().split('T')[0],
        description: `PayFast payment — Invoice #${invoiceNum}`,
        reference: paymentRef,
        source_type: 'invoice',
        source_id: invoiceId,
        total_amount: amount,
        currency: 'ZAR',
      })
      .select()
      .single();

    if (txError || !transaction) {
      console.error('[accounting] Failed to log revenue transaction:', txError);
      return;
    }

    // 4. Create double-entry journal entries for the revenue
    // Debit Bank (asset increases)
    await supabase.from('journal_entries').insert({
      transaction_id: transaction.id,
      workspace_id: workspaceId,
      account_id: bankAccountId,
      debit: amount,
      credit: 0.00,
      description: `Debit Bank for Invoice #${invoiceNum}`
    });

    // Credit Revenue (revenue increases)
    await supabase.from('journal_entries').insert({
      transaction_id: transaction.id,
      workspace_id: workspaceId,
      account_id: revenueAccountId,
      debit: 0.00,
      credit: amount,
      description: `Credit Revenue for Invoice #${invoiceNum}`
    });

    // 5. Handle PayFast processing fees if applicable
    const fee = parseFloat(feeStr || '0');
    if (fee > 0) {
      const feeAccountId = await getOrCreateAccount(supabase, workspaceId, '5000', 'PayFast Merchant Fees', 'expense');

      if (feeAccountId) {
        // Create parent expense transaction
        const { data: feeTransaction, error: feeTxError } = await supabase
          .from('accounting_transactions')
          .insert({
            workspace_id: workspaceId,
            date: new Date().toISOString().split('T')[0],
            description: `PayFast processing fee — Invoice #${invoiceNum}`,
            reference: paymentRef,
            source_type: 'expense',
            source_id: invoiceId,
            total_amount: -fee,
            currency: 'ZAR',
          })
          .select()
          .single();

        if (!feeTxError && feeTransaction) {
          // Debit Merchant Fees (expense increases)
          await supabase.from('journal_entries').insert({
            transaction_id: feeTransaction.id,
            workspace_id: workspaceId,
            account_id: feeAccountId,
            debit: fee,
            credit: 0.00,
            description: `Debit PayFast Merchant Fees for Invoice #${invoiceNum}`
          });

          // Credit Bank (asset decreases)
          await supabase.from('journal_entries').insert({
            transaction_id: feeTransaction.id,
            workspace_id: workspaceId,
            account_id: bankAccountId,
            debit: 0.00,
            credit: fee,
            description: `Credit Bank for PayFast Fees for Invoice #${invoiceNum}`
          });
        } else {
          console.error('[accounting] Failed to log fee transaction:', feeTxError);
        }
      }
    }

    console.log(`[accounting] Successfully logged revenue journal entries for Invoice #${invoiceNum}`);
  } catch (err: any) {
    console.error('[accounting] Exception in logRevenueToAccounting:', err);
  }
}

/**
 * Finds or creates a system account in public.chart_of_accounts.
 */
async function getOrCreateAccount(
  supabase: any,
  workspaceId: string,
  code: string,
  name: string,
  type: string
): Promise<string | null> {
  try {
    // Check if exists
    const { data: existing } = await supabase
      .from('chart_of_accounts')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('code', code)
      .maybeSingle();

    if (existing) return existing.id;

    // Insert new template account
    const { data: created, error } = await supabase
      .from('chart_of_accounts')
      .insert({
        workspace_id: workspaceId,
        code,
        name,
        type,
        is_system: true
      })
      .select('id')
      .single();

    if (error) {
      console.warn(`[accounting] Failed to insert account ${code} for workspace ${workspaceId}, finding type fallback:`, error.message);
      // Fallback: search for any account of this type
      const { data: fallback } = await supabase
        .from('chart_of_accounts')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('type', type)
        .limit(1)
        .maybeSingle();

      if (fallback) return fallback.id;
      return null;
    }

    return created.id;
  } catch (err: any) {
    console.error(`[accounting] Error in getOrCreateAccount for ${code}:`, err);
    return null;
  }
}
