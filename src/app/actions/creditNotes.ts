'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
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

    // Insert + invoice-balance update as a single atomic transaction (one row
    // lock, no window for a partial failure to leave the credit note and the
    // invoice out of sync) — see create_credit_note_atomic in
    // supabase/migrations/20260903000000_atomic_credit_notes.sql. Runs via
    // the admin client since requireWorkspaceAccess() above already did the
    // real auth/membership check; the RPC itself re-validates the invoice's
    // workspace_id and outstanding balance regardless.
    const adminClient = createAdminClient();
    const { data: rpcResult, error: rpcError } = await adminClient
      .rpc('create_credit_note_atomic', {
        p_workspace_id: workspaceId,
        p_invoice_id: data.invoiceId,
        p_contact_id: invoice.contact_id,
        p_credit_number: creditNumber,
        p_amount: data.amount,
        p_reason: data.reason,
        p_logged_by: userId,
      })
      .single();

    if (rpcError || !rpcResult) {
      logger.error({ err: rpcError, invoiceId: data.invoiceId, workspaceId }, 'finance.credit_note.create.failed');
      return { success: false, error: rpcError?.message?.includes('outstanding balance')
        ? rpcError.message
        : 'Failed to create credit note.' };
    }

    const { data: creditNote, error: fetchError } = await supabase
      .from('credit_notes')
      .select('*, invoice:invoices(invoice_number, total_amount, currency, contact:contacts(first_name, last_name, email))')
      .eq('id', (rpcResult as any).credit_note_id)
      .single();

    if (fetchError) {
      logger.error({ err: fetchError, invoiceId: data.invoiceId, workspaceId }, 'finance.credit_note.refetch.failed');
    }

    safeRevalidatePath('/finance/credit-notes');
    safeRevalidatePath('/invoices');
    return { success: true, creditNote: creditNote ?? { id: (rpcResult as any).credit_note_id } };
  } catch (err) {
    const clientError = toClientError(err);
    return { success: false, error: clientError.error };
  }
}

export async function deleteCreditNote(id: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  // Delete + invoice-balance restore as a single atomic transaction — see
  // delete_credit_note_atomic in supabase/migrations/20260903000000_atomic_credit_notes.sql.
  // Deleting a credit note now genuinely restores the amount_due it had
  // reduced, instead of just deleting the record and leaving the invoice's
  // balance permanently lowered.
  const adminClient = createAdminClient();
  const { error } = await adminClient
    .rpc('delete_credit_note_atomic', {
      p_workspace_id: workspaceId,
      p_credit_note_id: id,
    })
    .single();

  if (error) {
    logger.error({ err: error, id, workspaceId }, 'finance.credit_note.delete.failed');
    return { success: false, error: 'Failed to delete credit note.' };
  }

  safeRevalidatePath('/finance/credit-notes');
  safeRevalidatePath('/invoices');
  return { success: true };
}
