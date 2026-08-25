'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
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

// Now wired to a real "Apply retainer credit" action on the invoice detail
// view (src/components/invoices/InvoiceDetailClient.tsx) — was previously a
// hardened-but-orphaned Server Action with zero UI callers.
export async function applyRetainerToInvoice(invoiceId: string, contactId: string, workspaceId: string) {
  const supabase = await createServerClient();
  if (!(await requireWorkspaceMember(supabase, workspaceId))) {
    return { success: false, error: 'Unauthorized' };
  }

  // Ledger insert + retainer balance update + invoice amount_due update as a
  // single atomic transaction, against the invoice's actual outstanding
  // amount_due (not total_amount, which ignores prior payments/credits) —
  // see apply_retainer_to_invoice_atomic in
  // supabase/migrations/20260903000001_atomic_apply_retainer_to_invoice.sql.
  const adminClient = createAdminClient();
  const { data: rpcResult, error: rpcError } = await adminClient
    .rpc('apply_retainer_to_invoice_atomic', {
      p_workspace_id: workspaceId,
      p_invoice_id: invoiceId,
      p_contact_id: contactId,
    })
    .single();

  if (rpcError || !rpcResult) {
    logger.error({ err: rpcError, workspaceId, contactId, invoiceId }, 'retainers.apply_to_invoice.failed');
    const message = rpcError?.message || '';
    if (message.includes('No active retainer balance') || message.includes('nothing outstanding') || message.includes('Invoice not found')) {
      return { success: false, error: message };
    }
    return { success: false, error: 'Failed to apply retainer credit.' };
  }

  const { applied_amount: appliedCredit, invoice_paid: invoicePaid } = rpcResult as any;

  if (invoicePaid) {
    const { data: updatedInvoice } = await supabase
      .from('invoices')
      .select('*, contact:contacts(*)')
      .eq('id', invoiceId)
      .eq('workspace_id', workspaceId)
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
  revalidatePath('/finance/retainers');
  return { success: true, appliedAmount: Number(appliedCredit) };
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
