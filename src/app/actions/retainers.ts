'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

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

  if (ledgerError) {
    logger.error({ err: ledgerError, workspaceId, contactId, invoiceId }, 'retainers.ledger_entry.insert.failed');
    return { success: false, error: 'Failed to apply retainer credit.' };
  }

  const { error: retUpdateError } = await supabase
    .from('retainers')
    .update({ 
      amount_remaining: retainerBalance - appliedCredit 
    })
    .eq('id', retainer.id);

  if (retUpdateError) {
    logger.error({ err: retUpdateError, workspaceId, contactId }, 'retainers.balance.update.failed');
    return { success: false, error: 'Failed to update retainer balance.' };
  }

  // 5. Update Invoice (Assuming we have a field for balance_due or similar)
  // For now, we'll mark as paid if fully covered, or just log the credit
  if (appliedCredit >= invoiceTotal) {
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId)
      .select('*, contact:contacts(*)')
      .single();

    if (updatedInvoice) {
      try {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        const contactName = (updatedInvoice as any).contact
          ? `${(updatedInvoice as any).contact.first_name || ''} ${(updatedInvoice as any).contact.last_name || ''}`.trim()
          : null;
        dispatchWebhook(workspaceId, 'invoice.paid', {
          invoice: {
            id: updatedInvoice.id,
            number: updatedInvoice.invoice_number,
            amount: updatedInvoice.total_amount,
            currency: updatedInvoice.currency || 'ZAR',
            paid_at: new Date().toISOString(),
            contact: {
              id: updatedInvoice.contact_id,
              name: contactName || null,
            }
          }
        }).catch(() => {});
      } catch (e) {
        logger.error({ err: e, workspaceId, invoiceId }, 'retainers.apply_to_invoice.webhook_dispatch.failed');
      }
    }
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
