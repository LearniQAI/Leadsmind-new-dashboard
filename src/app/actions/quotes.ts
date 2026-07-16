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

  try {
    revalidatePath('/invoices');
    revalidatePath('/quotes');
  } catch (e) {
    logger.warn({ err: e }, 'quotes.revalidate_path.failed');
  }
  return { success: true, invoiceId: result.invoice_id, alreadyConverted: !!result.already_converted };
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
    .select('*, contact:contacts(*)')
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
    .select('*, contact:contacts(*)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}
