// Phase 5 — completion email for a processed financial document. Uses the real sendEmail
// primitive (src/lib/email.ts, Resend) and the real "deep link back into the platform"
// pattern already used by certificateEmail.ts, rather than a raw attachment dump.
import { sendEmail } from '@/lib/email';
import { logger } from '@/shared/logger';

type AdminClient = {
  from: (table: string) => any;
};

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.leadsmind.io';
}

export async function sendDocumentProcessedEmail(
  admin: AdminClient,
  documentId: string,
  summary: { txCount: number; receiptExtracted: boolean; gapMonths: string[] }
) {
  const { data: doc } = await admin
    .from('financial_documents')
    .select('id, workspace_id, file_name, document_kind, uploaded_by, notify_email, status, error_message')
    .eq('id', documentId)
    .maybeSingle();
  if (!doc) return;

  let destination = doc.notify_email;
  if (!destination && doc.uploaded_by) {
    const { data: user } = await admin.from('users').select('email').eq('id', doc.uploaded_by).maybeSingle();
    destination = user?.email || null;
  }
  if (!destination) {
    logger.error({ documentId }, 'finance.document_notification.no_destination');
    return;
  }

  const { data: workspace } = await admin
    .from('workspaces')
    .select('resend_api_key, email_from_address, email_from_name')
    .eq('id', doc.workspace_id)
    .maybeSingle();

  const appUrl = getAppUrl();
  const link = `${appUrl}/finance/documents/${doc.id}`;

  const bodyLines: string[] = [];
  if (doc.status === 'failed') {
    bodyLines.push(`<p>We couldn't fully process <strong>${escapeHtml(doc.file_name)}</strong>: ${escapeHtml(doc.error_message || 'an unknown error occurred')}.</p>`);
  } else {
    if (summary.txCount > 0) bodyLines.push(`<p>We extracted <strong>${summary.txCount}</strong> transaction${summary.txCount === 1 ? '' : 's'} from <strong>${escapeHtml(doc.file_name)}</strong>.</p>`);
    if (summary.receiptExtracted) bodyLines.push(`<p>We read the receipt/invoice details from <strong>${escapeHtml(doc.file_name)}</strong> and checked it against your bank transactions.</p>`);
    if (summary.gapMonths.length) bodyLines.push(`<p>⚠ No statement coverage found for: ${summary.gapMonths.map(escapeHtml).join(', ')}.</p>`);
  }

  const html = `
    <h2>Your document has been processed</h2>
    ${bodyLines.join('\n')}
    <p><a href="${link}" style="background:#2952CC;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;display:inline-block;">View full results →</a></p>
    <p style="font-size:12px;color:#6B7280;">This is AI-assisted bookkeeping, not a certified accountant's review — please have a qualified accountant confirm anything submitted to tax authorities.</p>
  `;

  try {
    await sendEmail({
      to: destination,
      subject: `Your document "${doc.file_name}" has been processed`,
      html,
      config: {
        apiKey: workspace?.resend_api_key,
        fromEmail: workspace?.email_from_address,
        fromName: workspace?.email_from_name || 'LeadsMind Bookkeeping',
      },
    });
    await admin.from('financial_documents').update({ notified_at: new Date().toISOString() }).eq('id', doc.id);
  } catch (err: any) {
    // A notification failure must never fail the whole processing job — the document is
    // already correctly processed/failed in the DB; only the email side degrades.
    logger.error({ err, documentId }, 'finance.document_notification.send_failed');
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}
