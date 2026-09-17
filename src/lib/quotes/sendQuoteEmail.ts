import { createAdminClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';
import { getWorkspaceEmailConfig } from '@/lib/email/resolveConfig';
import { htmlToPdfBuffer } from '@/lib/pdf/htmlToPdf';
import { logger } from '@/shared/logger';

// Mirrors src/lib/invoices/sendInvoiceEmail.ts — quotes never had a real
// send/email path (the Quotes Ledger's "Resend Quote" action only flipped
// `status` to 'sent', it never actually emailed anything). This gives
// quotes the same real PDF-attach + email-send behavior invoices already
// have, marking the quote 'sent' only after the email actually succeeds.
export async function sendQuoteEmail(params: {
  workspaceId: string;
  quoteId: string;
}): Promise<{ success: boolean; error?: string }> {
  const { workspaceId, quoteId } = params;
  const supabase = createAdminClient();

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('*')
    .eq('id', quoteId)
    .eq('workspace_id', workspaceId)
    .single();

  if (quoteError || !quote) {
    logger.error({ err: quoteError, quoteId, workspaceId }, 'quote.send.quote_not_found');
    return { success: false, error: 'Quote not found' };
  }

  const { data: contact } = await supabase
    .from('contacts')
    .select('email, first_name, last_name')
    .eq('id', quote.contact_id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!contact?.email) {
    logger.error({ quoteId, workspaceId, contactId: quote.contact_id }, 'quote.send.contact_email_missing');
    return { success: false, error: 'Contact has no email address' };
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('name')
    .eq('id', workspaceId)
    .single();

  const emailConfig = await getWorkspaceEmailConfig(workspaceId);

  const contactName = `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'there';
  const quoteLabel = quote.quote_number || `QT-${String(quote.id).substring(0, 8).toUpperCase()}`;
  const money = (n: any) => `${quote.currency || 'ZAR'} ${(Number(n) || 0).toFixed(2)}`;

  const subject = `Quote ${quoteLabel} from ${workspace?.name || 'LeadsMind'}`;
  const bodyHtml = `<p>Hi ${contactName},</p><p>Please find attached quote ${quoteLabel} for ${money(quote.total_amount)}${quote.valid_until ? `, valid until ${new Date(quote.valid_until).toDateString()}` : ''}.</p>`;

  const items: any[] = Array.isArray(quote.items) ? quote.items : [];
  const itemRows = items.map((item) => `
    <tr>
      <td style="padding:8px 0;">${item.description || ''}</td>
      <td style="padding:8px 0; text-align:center;">${item.quantity ?? ''}</td>
      <td style="padding:8px 0; text-align:right;">${Number(item.rate ?? item.unit_amount ?? 0).toFixed(2)}</td>
      <td style="padding:8px 0; text-align:right;">${(Number(item.quantity || 0) * Number(item.rate ?? item.unit_amount ?? 0)).toFixed(2)}</td>
    </tr>
  `).join('');

  const quoteHtml = `
    <div style="margin-bottom:24px;">
      <p><strong>Quote #:</strong> ${quoteLabel}</p>
      <p><strong>Client:</strong> ${contactName}${contact.email ? ` (${contact.email})` : ''}</p>
      ${quote.valid_until ? `<p><strong>Valid until:</strong> ${new Date(quote.valid_until).toDateString()}</p>` : ''}
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
      <p>Subtotal: ${money(quote.subtotal)}</p>
      <p>Tax: ${money(quote.tax_total)}</p>
      <p style="font-size:16px; font-weight:700;">Total: ${money(quote.total_amount)}</p>
    </div>
    ${quote.terms_and_conditions ? `<div style="margin-top:24px;"><h3>Terms & Conditions</h3><p style="white-space:pre-wrap;">${quote.terms_and_conditions}</p></div>` : ''}
  `;

  const pdfBuffer = await htmlToPdfBuffer(quoteHtml, `Quote ${quoteLabel}`);

  await sendEmail({
    to: contact.email,
    subject,
    html: bodyHtml,
    attachments: [{ filename: `${quoteLabel}.pdf`, content: pdfBuffer }],
    config: {
      apiKey: emailConfig?.apiKey,
      fromEmail: emailConfig?.fromEmail,
      fromName: emailConfig?.fromName,
    },
  });

  const { error: updateError } = await supabase
    .from('quotes')
    .update({ status: 'sent', updated_at: new Date().toISOString() })
    .eq('id', quote.id)
    .eq('workspace_id', workspaceId);

  if (updateError) throw updateError;

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
    dispatchWebhook(workspaceId, 'quote.sent', {
      quote: { id: quote.id, quote_number: quoteLabel, status: 'sent', contact_id: quote.contact_id },
    }).catch(() => {});
  } catch (e) {
    logger.error({ err: e, quoteId }, 'quote.send.webhook_dispatch_failed');
  }

  return { success: true };
}
