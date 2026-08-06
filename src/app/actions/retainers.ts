'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

// Verifies the caller is a member of the explicit workspaceId argument these
// functions take (not the cookie-derived active workspace — the UI passes a
// specific workspaceId tied to the invoice/contact being viewed, which isn't
// guaranteed to match whatever the cookie currently holds). Same shape as
// shipments.ts's requireWorkspaceMember() from Priority 0 item 6.
async function requireWorkspaceMember(supabase: any, workspaceId: string): Promise<boolean> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;
  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle();
  return !!member;
}

// Confirmed still dead/unwired in this pass (zero callers anywhere in src/)
// — fixed in place rather than deleted, since it's not a duplicate of
// anything (matches the getInvoiceAnalytics precedent from Priority 2 item
// 6: dead-but-plausible, independently-callable Server Actions still get
// hardened, not left insecure just for being currently unwired from a UI).
export async function applyRetainerToInvoice(invoiceId: string, contactId: string, workspaceId: string) {
  const supabase = await createServerClient();
  if (!(await requireWorkspaceMember(supabase, workspaceId))) {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Fetch invoice total — scoped to the verified workspace (previously
  // had no workspace scoping at all, flagged in the triage).
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .select('total_amount')
    .eq('id', invoiceId)
    .eq('workspace_id', workspaceId)
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
      .eq('workspace_id', workspaceId)
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
  if (!(await requireWorkspaceMember(supabase, workspaceId))) return 0;

  const { data, error } = await supabase
    .from('retainers')
    .select('amount_remaining')
    .eq('contact_id', contactId)
    .eq('workspace_id', workspaceId)
    .single();

  if (error) return 0;
  return Number(data?.amount_remaining) || 0;
}

export async function listRetainers(workspaceId: string) {
  const supabase = await createServerClient();
  if (!(await requireWorkspaceMember(supabase, workspaceId))) return [];

  const { data, error } = await supabase
    .from('retainers')
    .select('*, contact:contacts(first_name, last_name, email)')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error, workspaceId }, 'retainers.list.failed');
    return [];
  }
  return data || [];
}

export async function getRetainerLedger(retainerId: string, workspaceId: string) {
  const supabase = await createServerClient();
  if (!(await requireWorkspaceMember(supabase, workspaceId))) return [];

  // Ledger entries have no direct retainer_id — they're tied to the same
  // (workspace_id, contact_id) pair a retainer is scoped to (confirmed via
  // live schema: retainer_ledger_entries has no retainer_id column at all).
  const { data: retainer } = await supabase
    .from('retainers')
    .select('contact_id')
    .eq('id', retainerId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!retainer) return [];

  const { data, error } = await supabase
    .from('retainer_ledger_entries')
    .select('*, invoice:invoices(invoice_number)')
    .eq('workspace_id', workspaceId)
    .eq('contact_id', retainer.contact_id)
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error, retainerId, workspaceId }, 'retainers.ledger.fetch.failed');
    return [];
  }
  return data || [];
}

// Creates a retainer with its initial deposit — one retainer per (workspace,
// contact) is the model this app's existing applyRetainerToInvoice()/
// getRetainerBalance() already assume (both look up by contact_id, not by a
// list of retainers). A second call for a contact that already has one tops
// it up instead of creating a duplicate row.
export async function createOrTopUpRetainer(data: { workspaceId: string; contactId: string; amount: number }) {
  const supabase = await createServerClient();
  if (!(await requireWorkspaceMember(supabase, data.workspaceId))) {
    return { success: false, error: 'Unauthorized' };
  }
  if (!data.contactId) return { success: false, error: 'Select a contact.' };
  if (!data.amount || data.amount <= 0) return { success: false, error: 'Enter a deposit amount greater than zero.' };

  const { data: existing, error: fetchError } = await supabase
    .from('retainers')
    .select('id, amount_remaining, total_amount')
    .eq('workspace_id', data.workspaceId)
    .eq('contact_id', data.contactId)
    .maybeSingle();

  if (fetchError) {
    logger.error({ err: fetchError, ...data }, 'retainers.create_or_top_up.fetch.failed');
    return { success: false, error: 'Failed to look up existing retainer.' };
  }

  let retainerId: string;

  if (existing) {
    const { error: updateError } = await supabase
      .from('retainers')
      .update({
        amount_remaining: Number(existing.amount_remaining) + data.amount,
        total_amount: Number(existing.total_amount) + data.amount,
        status: 'active',
      })
      .eq('id', existing.id);

    if (updateError) {
      logger.error({ err: updateError, ...data }, 'retainers.top_up.update.failed');
      return { success: false, error: 'Failed to top up retainer.' };
    }
    retainerId = existing.id;
  } else {
    const { data: created, error: insertError } = await supabase
      .from('retainers')
      .insert({
        workspace_id: data.workspaceId,
        contact_id: data.contactId,
        amount_remaining: data.amount,
        total_amount: data.amount,
        status: 'active',
      })
      .select('id')
      .single();

    if (insertError || !created) {
      logger.error({ err: insertError, ...data }, 'retainers.create.insert.failed');
      return { success: false, error: 'Failed to create retainer.' };
    }
    retainerId = created.id;
  }

  const { error: ledgerError } = await supabase
    .from('retainer_ledger_entries')
    .insert({
      workspace_id: data.workspaceId,
      contact_id: data.contactId,
      amount: data.amount,
      entry_type: 'credit_advance',
    });

  if (ledgerError) {
    logger.error({ err: ledgerError, ...data }, 'retainers.create_or_top_up.ledger_entry.failed');
    return { success: false, error: 'Retainer balance updated, but failed to record the ledger entry.' };
  }

  revalidatePath('/finance/retainers');
  return { success: true, retainerId };
}
