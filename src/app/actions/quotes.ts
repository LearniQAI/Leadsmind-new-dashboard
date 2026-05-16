'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

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

  if (invoiceError) return { success: false, error: invoiceError.message };

  const { error: updateError } = await supabase
    .from('quotes')
    .update({ 
      status: 'converted',
      converted_invoice_id: invoice.id 
    })
    .eq('id', quoteId);

  if (updateError) return { success: false, error: updateError.message };

  revalidatePath('/invoices');
  revalidatePath('/quotes');
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

  if (error) return { success: false, error: error.message };
  revalidatePath('/quotes');
  return { success: true, data };
}

export async function deleteQuote(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  revalidatePath('/quotes');
  return { success: true };
}

export async function saveQuote(data: any) {
  const supabase = await createServerClient();
  const { data: quote, error } = await supabase
    .from('quotes')
    .insert(data)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath('/quotes');
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

  if (error) return { success: false, error: error.message };
  revalidatePath('/quotes');
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
