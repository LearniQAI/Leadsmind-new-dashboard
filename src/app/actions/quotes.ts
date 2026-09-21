'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { userSafeMessage } from '@/shared/errors/userSafe';

// Columns that actually exist on public.quotes. InvoiceFormContainer is
// shared with Invoices and always includes an `issue_date` field in its save
// payload — quotes has no such column, so spreading the raw form payload
// straight into .insert()/.update() made PostgREST reject the entire write
// with a schema-cache error (PGRST204) before RLS is even evaluated, which
// is why every quote save failed with a generic "Failed to save quote" toast
// regardless of what was filled in. Same root cause invoices already hit and
// fixed via INVOICE_COLUMNS/pickInvoiceColumns in finance.ts — quotes never
// got the equivalent whitelist until now.
const QUOTE_COLUMNS = [
  'contact_id',
  'quote_number',
  'status',
  'subtotal',
  'tax_total',
  'discount_total',
  'shipping_amount',
  'total_amount',
  'currency',
  'notes',
  'terms',
  'expiry_date',
  'assigned_to',
  'metadata',
  'shipping_charges',
  'adjustment',
  'terms_and_conditions',
  'salesperson_id',
  'converted_invoice_id',
  'items',
  'valid_until',
  'deal_id',
  'signature_data',
  'signed_at',
] as const;

function pickQuoteColumns(data: Record<string, any>) {
  const picked: Record<string, any> = {};
  for (const key of QUOTE_COLUMNS) {
    if (data[key] !== undefined) picked[key] = data[key];
  }
  return picked;
}

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
    // Same rule as sendInvoiceNow: only provider/config rejections are safe to
    // show; PDF-generation and DB failures are masked (full detail logged above).
    return { success: false, error: userSafeMessage(e, 'Failed to send quote. Please try again.') };
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

  const { data: quote, error } = await supabase
    .from('quotes')
    .insert({ ...pickQuoteColumns(data ?? {}), workspace_id: workspaceId })
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

  // invoice_number/due_date come from the shared InvoiceFormContainer payload
  // and have no matching quotes columns — they map onto quote_number/valid_until
  // instead, computed here before the whitelist below drops everything else
  // that isn't a real column (issue_date, amount_due, amount_paid,
  // custom_field_values, etc.).
  const { invoice_number, due_date } = data ?? {};
  const validData = pickQuoteColumns(data ?? {});

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
