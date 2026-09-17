'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';

export async function convertQuoteToInvoice(quoteId: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase.rpc('convert_quote_to_invoice', {
    p_quote_id: quoteId,
    p_workspace_id: workspaceId,
  });

  if (error) {
    logger.error({ err: error, quoteId, workspaceId }, 'quotes.convert_to_invoice.rpc.failed');
    return { success: false, error: error.message || 'Failed to convert quote to invoice.' };
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result?.success) {
    return { success: false, error: result?.error_message || 'Failed to convert quote to invoice.' };
  }

  // Fire invoice.created exactly once per real conversion, same as every other
  // invoice-creation path in the app. This used to only happen via the now-removed
  // finance.ts duplicate of this function (the one the old Proposals UI called) —
  // converting from the real Quotes Ledger silently never fired it.
  if (!result.already_converted) {
    try {
      const { data: invoice } = await supabase.from('invoices').select('*').eq('id', result.invoice_id).single();
      if (invoice) {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        dispatchWebhook(invoice.workspace_id, 'invoice.created', {
          invoice: { id: invoice.id, number: invoice.invoice_number, amount: invoice.total_amount ?? invoice.amount, currency: invoice.currency || 'ZAR', status: invoice.status, contact_id: invoice.contact_id },
        }).catch(() => {});
      }
    } catch (e) {
      logger.error({ err: e, invoiceId: result.invoice_id }, 'quotes.convert_to_invoice.webhook_dispatch.failed');
    }
  }

  try {
    revalidatePath('/invoices');
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, invoiceId: result.invoice_id, alreadyConverted: !!result.already_converted };
}

// Real send: attaches a generated PDF and emails the quote to the contact,
// mirroring sendInvoiceNow for invoices. The Quotes Ledger's old "Resend
// Quote" action only flipped status to 'sent' locally — no email ever went
// out. sendQuoteEmail() marks status 'sent' itself, only after the send
// actually succeeds.
export async function sendQuoteNow(quoteId: string) {
  const { workspaceId } = await requireWorkspaceAccess();

  try {
    const { sendQuoteEmail } = await import('@/lib/quotes/sendQuoteEmail');
    const result = await sendQuoteEmail({ workspaceId, quoteId });
    if (!result.success) {
      logger.error({ quoteId, workspaceId, reason: result.error }, 'quotes.send_now.failed');
      return { success: false, error: result.error || 'Failed to send quote' };
    }
  } catch (e) {
    logger.error({ err: e, quoteId, workspaceId }, 'quotes.send_now.failed');
    const message = e instanceof Error ? e.message : 'Failed to send quote';
    return { success: false, error: message };
  }

  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true };
}

export async function updateQuoteStatus(id: string, status: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error({ err: error, quoteId: id, workspaceId }, 'quotes.status.update.failed');
    return { success: false, error: 'Failed to update quote status.' };
  }
  if (!data) return { success: false, error: 'Quote not found.' };

  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, data };
}

export async function deleteQuote(id: string) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select('id')
    .maybeSingle();

  if (error) {
    logger.error({ err: error, quoteId: id, workspaceId }, 'quotes.delete.failed');
    return { success: false, error: 'Failed to delete quote.' };
  }
  if (!data) return { success: false, error: 'Quote not found.' };

  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true };
}

export async function saveQuote(data: any) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  // workspace_id is never trusted from the caller — always the verified one.
  const { workspace_id: _ignoredWorkspaceId, ...rest } = data ?? {};

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({ ...rest, workspace_id: workspaceId })
    .select()
    .single();

  if (error) {
    logger.error({ err: error, workspaceId }, 'quotes.save.failed');
    return { success: false, error: 'Failed to save quote.' };
  }
  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, data: quote };
}

export async function getQuoteById(id: string) {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return null;
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*, contact:contacts(*), deal:opportunities(id, title)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function updateQuote(id: string, data: any) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  // Filter out any potential invalid columns, and never let the caller move
  // a quote into a different workspace.
  const { amount_due, amount_paid, custom_field_values, invoice_number, due_date, workspace_id: _ignoredWorkspaceId, ...validData } = data;

  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      ...validData,
      quote_number: invoice_number?.includes('Q-') ? invoice_number : invoice_number?.replace('INV-', 'Q-') || validData.quote_number,
      valid_until: due_date || validData.valid_until,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .select()
    .maybeSingle();

  if (error) {
    logger.error({ err: error, quoteId: id, workspaceId }, 'quotes.update.failed');
    return { success: false, error: 'Failed to update quote.' };
  }
  if (!quote) return { success: false, error: 'Quote not found.' };

  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, data: quote };
}

// Feeds the optional "Linked Deal" selector on the quote builder — lets a
// quote attach to a real Pipeline deal (public.opportunities), which quotes
// previously had no relationship to at all.
export async function getOpenDealsForQuoteLinking() {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return [];
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select('id, title, contact_id, status')
    .eq('workspace_id', workspaceId)
    .eq('status', 'open')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getQuotes(_workspaceId?: string) {
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return [];
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*, contact:contacts(*), deal:opportunities(id, title)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}
