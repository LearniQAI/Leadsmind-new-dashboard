'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

export async function convertQuoteToInvoice(quoteId: string) {
  const supabase = await createServerClient();

  // 1. Fetch quote data
  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .single();

  if (quoteError || !quote) return { success: false, error: 'Quote not found' };
  if (quote.status !== 'accepted') return { success: false, error: 'Only accepted quotes can be converted' };

  // 2. Generate unique invoice number (Current Year + Sequence)
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', quote.workspace_id);
  
  const invoiceNumber = `INV-${year}-${(count || 0) + 1001}`;

  // 3. Atomic Transaction: Insert Invoice and Update Quote
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      workspace_id: quote.workspace_id,
      contact_id: quote.contact_id,
      invoice_number: invoiceNumber,
      status: 'draft',
      items: quote.items,
      subtotal: quote.subtotal,
      tax_total: quote.tax_total,
      total_amount: quote.total_amount,
      shipping_charges: quote.shipping_charges,
      adjustment: quote.adjustment,
      terms_and_conditions: quote.terms_and_conditions,
    })
    .select()
    .single();

  if (invoiceError) {
    logger.error({ err: invoiceError, quoteId }, 'quotes.convert_to_invoice.insert.failed');
    return { success: false, error: 'Failed to create invoice.' };
  }

  const { error: updateError } = await supabase
    .from('quotes')
    .update({
      status: 'converted',
      converted_invoice_id: invoice.id
    })
    .eq('id', quoteId);

  if (updateError) {
    logger.error({ err: updateError, quoteId }, 'quotes.convert_to_invoice.update.failed');
    return { success: false, error: 'Failed to update quote status.' };
  }

  try {
    revalidatePath('/invoices');
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, invoiceId: invoice.id };
}

export async function updateQuoteStatus(id: string, status: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ err: error, quoteId: id }, 'quotes.status.update.failed');
    return { success: false, error: 'Failed to update quote status.' };
  }
  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, data };
}

export async function deleteQuote(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) {
    logger.error({ err: error, quoteId: id }, 'quotes.delete.failed');
    return { success: false, error: 'Failed to delete quote.' };
  }
  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true };
}

export async function saveQuote(data: any) {
  const supabase = await createServerClient();
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert(data)
    .select()
    .single();

  if (error) {
    logger.error({ err: error }, 'quotes.save.failed');
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
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*, contact:contacts(*)')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function updateQuote(id: string, data: any) {
  const supabase = await createServerClient();
  // Filter out any potential invalid columns
  const { amount_due, amount_paid, custom_field_values, invoice_number, due_date, ...validData } = data;
  
  const { data: quote, error } = await supabase
    .from('quotes')
    .update({
      ...validData,
      quote_number: invoice_number?.includes('Q-') ? invoice_number : invoice_number?.replace('INV-', 'Q-') || validData.quote_number,
      valid_until: due_date || validData.valid_until,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    logger.error({ err: error, quoteId: id }, 'quotes.update.failed');
    return { success: false, error: 'Failed to update quote.' };
  }
  try {
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, data: quote };
}

export async function getQuotes(workspaceId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('quotes')
    .select('*, contact:contacts(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}
