'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { ValidationError, toClientError } from '@/shared/errors/AppError';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (e) {
    // Gracefully handle next/cache bailout when run outside server context
  }
}

export async function getCreditNotes() {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return [];
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('credit_notes')
    .select('*, invoice:invoices(id, invoice_number, total_amount, amount_due, amount_paid, currency, contact:contacts(first_name, last_name, email))')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error, workspaceId }, 'finance.credit_notes.fetch.failed');
    return [];
  }
  return data || [];
}

// Same "count existing rows for this workspace, this year" convention already
// used by the quote-to-invoice conversion RPC for invoice_number generation
// (INV-{year}-{count+1001}) — reused here as CN-{year}-{count+1001} so credit
// notes follow the identical numbering scheme rather than inventing a new one.
async function generateCreditNumber(supabase: any, workspaceId: string): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('credit_notes')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  return `CN-${year}-${(count || 0) + 1001}`;
}

export async function createCreditNote(data: { invoiceId: string; amount: number; reason: string }) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  try {
    if (!data.invoiceId) throw new ValidationError('Select an invoice to credit.');
    if (!data.amount || data.amount <= 0) throw new ValidationError('Enter a credit amount greater than zero.');
    if (!data.reason?.trim()) throw new ValidationError('Provide a reason for this credit note.');

    // Verify the invoice actually belongs to this workspace before crediting
    // anything against it — same ownership check as writeOffInvoice.
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, contact_id, amount_due, amount_paid, total_amount')
      .eq('id', data.invoiceId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (invoiceError || !invoice) {
      return { success: false, error: 'Invoice not found.' };
    }

    const amountDue = Number(invoice.amount_due ?? invoice.total_amount ?? 0);
    const amountPaid = Number(invoice.amount_paid ?? 0);
    const outstanding = amountDue - amountPaid;

    if (data.amount > outstanding) {
      return { success: false, error: `Credit amount cannot exceed the outstanding balance of ${outstanding.toFixed(2)}.` };
    }

    const creditNumber = await generateCreditNumber(supabase, workspaceId);

    const { data: creditNote, error: insertError } = await supabase
      .from('credit_notes')
      .insert({
        invoice_id: data.invoiceId,
        workspace_id: workspaceId,
        contact_id: invoice.contact_id,
        credit_number: creditNumber,
        amount: data.amount,
        reason: data.reason,
        status: 'issued',
        issue_date: new Date().toISOString(),
        logged_by: userId,
      })
      .select('*, invoice:invoices(invoice_number, total_amount, currency, contact:contacts(first_name, last_name, email))')
      .single();

    if (insertError) {
      logger.error({ err: insertError, invoiceId: data.invoiceId, workspaceId }, 'finance.credit_note.create.failed');
      return { success: false, error: 'Failed to create credit note.' };
    }

    // Reduce what's actually owed (amount_due) — never amount_paid, which
    // represents real cash collected and feeds total_collected in invoice
    // analytics. A credit note is not a payment.
    const newAmountDue = Math.max(0, amountDue - data.amount);
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ amount_due: newAmountDue })
      .eq('id', data.invoiceId)
      .eq('workspace_id', workspaceId);

    if (updateError) {
      logger.error({ err: updateError, invoiceId: data.invoiceId, workspaceId }, 'finance.credit_note.invoice_update.failed');
      return { success: false, error: 'Credit note recorded, but failed to update invoice balance.' };
    }

    safeRevalidatePath('/finance/credit-notes');
    safeRevalidatePath('/invoices');
    return { success: true, creditNote };
  } catch (err) {
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

export async function deleteCreditNote(id: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('credit_notes')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) {
    logger.error({ err: error, id, workspaceId }, 'finance.credit_note.delete.failed');
    return { success: false, error: 'Failed to delete credit note.' };
  }

  safeRevalidatePath('/finance/credit-notes');
  return { success: true };
}
