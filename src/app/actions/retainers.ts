'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function applyRetainerToInvoice(invoiceId: string, contactId: string, workspaceId: string) {
  const supabase = await createServerClient();

  // 1. Fetch invoice total
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .single();

  if (invError || !invoice) return { success: false, error: 'Invoice not found' };

  // 2. Fetch retainer balance
  const { data: retainer, error: retError } = await supabase
    .from('retainers')
    .select('*')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  if (retError || !retainer || Number(retainer.amount_remaining) <= 0) {
    return { success: false, error: 'No active retainer balance found' };
  }

  const invoiceTotal = Number(invoice.total_amount);
  const retainerBalance = Number(retainer.amount_remaining);
  
  // 3. Calculate applied credit
  const appliedCredit = Math.min(invoiceTotal, retainerBalance);

  // 4. Update Retainer and Ledger
  const { error: ledgerError } = await supabase
    .from('retainer_ledger_entries')
    .insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      amount: appliedCredit,
      entry_type: 'debit_invoice_apply',
      invoice_id: invoiceId
    });

  if (ledgerError) return { success: false, error: ledgerError.message };

  const { error: retUpdateError } = await supabase
    .from('retainers')
    .update({ 
      amount_remaining: retainerBalance - appliedCredit 
    })
    .eq('id', retainer.id);

  if (retUpdateError) return { success: false, error: retUpdateError.message };

  // 5. Update Invoice (Assuming we have a field for balance_due or similar)
  // For now, we'll mark as paid if fully covered, or just log the credit
  if (appliedCredit >= invoiceTotal) {
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId);
  }

  revalidatePath('/invoices');
  return { success: true, appliedAmount: appliedCredit };
}

export async function getRetainerBalance(contactId: string, workspaceId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('retainers')
    .select('amount_remaining')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) return 0;
  return Number(data?.amount_remaining) || 0;
}
