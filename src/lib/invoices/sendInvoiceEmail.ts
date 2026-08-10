import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { htmlToPdfBuffer } from '@/lib/pdf/htmlToPdf';
import { logger } from '@/shared/logger';

// Core PDF-generate + email-send logic shared by the automation `send_invoice`
// action (actions_registry.ts) and every invoice-creation path that must
// auto-send on creation (courseCommerce/funnel-order/lease webhooks). Takes
// an explicit invoiceId rather than looking one up, since callers already
// have the row they just created or looked up.
export async function sendInvoiceEmail(params: {
  workspaceId: string;
  invoiceId: string;
  // Only the automation send_invoice action (draft -> sent) should flip
  // status; paths that create invoices already 'paid' must not overwrite
  // that status.
  markSent?: boolean;
  emailSubject?: string;
  emailBody?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId, invoiceId, markSent, emailSubject, emailBody } = params;
  const supabase = createAdminClient();

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', invoiceId)
    .eq('workspace_id', workspaceId)
    .single();

  if (invoiceError || !invoice) {
    logger.error({ err: invoiceError, invoiceId, workspaceId }, 'invoice.auto_send.invoice_not_found');
    return { success: false, error: 'Invoice not found' };
  }

  const { data: contact } = await supabase
    .from('contacts')
    .select('email, first_name, last_name')
    .eq('id', invoice.contact_id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!contact?.email) {
    // Fail loudly, not silently — same standard as the rest of this
    // project's notification paths. The invoice itself is still created;
    // only the email is skipped.
    logger.error({ invoiceId, workspaceId, contactId: invoice.contact_id }, 'invoice.auto_send.contact_email_missing');
    return { success: false, error: 'Contact has no email address' };
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

  const emailConfig = await getWorkspaceEmailConfig(workspaceId);

  const replaceTokens = (str: string) => {
    return str
      .replace(/\{\{contact\.([^}]+)\}\}/g, (_, field) => (contact as any)[field] ?? '')
      .replace(/\{\{invoice\.([^}]+)\}\}/g, (_, field) => (invoice as any)[field] ?? '');
  };

  const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'there';
  const invoiceLabel = invoice.invoice_number || `INV-${String(invoice.id).substring(0, 8).toUpperCase()}`;

  const subject = emailSubject
    ? replaceTokens(emailSubject)
    : `Invoice ${invoiceLabel} from ${workspace?.name || 'LeadsMind'}`;

  const bodyHtml = emailBody
    ? replaceTokens(emailBody)
    : `<p>Hi ${contactName},</p><p>Please find attached invoice ${invoiceLabel} for ${invoice.currency || 'ZAR'} ${Number(invoice.total_amount ?? invoice.amount_due ?? 0).toFixed(2)}${invoice.status === 'paid' ? ', which has been paid in full. Thank you!' : `, due ${invoice.due_date ? new Date(invoice.due_date).toDateString() : 'on receipt'}.`}</p>`;

  const items: any[] = Array.isArray(invoice.items) ? invoice.items : [];
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:8px 0;">${item.description || ''}</td>
      <td style="padding:8px 0; text-align:center;">${item.quantity ?? ''}</td>
      <td style="padding:8px 0; text-align:right;">${Number(item.rate ?? item.unit_amount ?? 0).toFixed(2)}</td>
      <td style="padding:8px 0; text-align:right;">${(Number(item.quantity || 0) * Number(item.rate ?? item.unit_amount ?? 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  const invoiceHtml = `
    <div style="margin-bottom:24px;">
      <p><strong>Invoice #:</strong> ${invoiceLabel}</p>
      <p><strong>Billed to:</strong> ${contactName}${contact.email ? ` (${contact.email})` : ''}</p>
      <p><strong>Due date:</strong> ${invoice.due_date ? new Date(invoice.due_date).toDateString() : 'On receipt'}</p>
    </div>
    ${items.length > 0 ? `
    <table style="width:100%; border-collapse:collapse; font-size:12px;">
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0; text-align:left;">
          <th style="padding:8px 0;">Description</th>
          <th style="padding:8px 0; text-align:center;">Qty</th>
          <th style="padding:8px 0; text-align:right;">Unit Price</th>
          <th style="padding:8px 0; text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>` : ''}
    <div style="margin-top:16px; text-align:right; font-size:12px;">
      <p style="font-size:16px; font-weight:700;">Total due: ${invoice.currency || 'ZAR'} ${Number(invoice.total_amount ?? invoice.amount_due ?? 0).toFixed(2)}</p>
    </div>
    ${invoice.notes ? `<div style="margin-top:24px;"><h3>Notes</h3><p style="white-space:pre-wrap;">${invoice.notes}</p></div>` : ''}
  `;

  const pdfBuffer = await htmlToPdfBuffer(invoiceHtml, `Invoice ${invoiceLabel}`);

  await sendEmail({
    to: contact.email,
    subject,
    html: bodyHtml,
    attachments: [{ filename: `${invoiceLabel}.pdf`, content: pdfBuffer }],
    config: {
      apiKey: emailConfig?.apiKey,
      fromEmail: emailConfig?.fromEmail,
      fromName: emailConfig?.fromName,
    },
  });

  if (markSent) {
    const { error: updateError } = await supabase
      .from('invoices')
      .update({ status: 'sent' })
      .eq('id', invoice.id)
      .eq('workspace_id', workspaceId);

    if (updateError) throw updateError;
  }

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
    dispatchWebhook(workspaceId, 'invoice.sent', {
      invoice: { id: invoice.id, invoice_number: invoiceLabel, status: markSent ? 'sent' : invoice.status, contact_id: invoice.contact_id },
    }).catch(() => {});
  } catch (e) {
    logger.error({ err: e, invoiceId }, 'invoice.auto_send.webhook_dispatch_failed');
  }

  return { success: true };
}
