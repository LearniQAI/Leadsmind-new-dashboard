// Pulled out of the summary API route so it can be imported without dragging in
// requireWorkspaceRole()'s auth chain (which depends on React's cache() and only works
// inside a live Next.js request) — this module is pure data aggregation and is also used
// directly by the export route and reusable anywhere a document's computed report is needed.
import { createAdminClient } from '@/lib/supabase/server';
import { NotFoundError } from '@/shared/errors/AppError';

export const BOOKKEEPING_DISCLAIMER =
  'This is AI-assisted bookkeeping, generated automatically from the documents you uploaded. ' +
  'It is a helpful first pass, not a certified replacement for a registered accountant — ' +
  'have a qualified accountant review anything before submitting it to SARS or another authority.';

export async function getDocumentSummaryData(workspaceId: string, documentId: string) {
  const adminClient = createAdminClient();

  const { data: doc, error: docError } = await adminClient
    .from('financial_documents')
    .select('id, file_name, mime_type, document_kind, status, error_message, created_at')
    .eq('id', documentId)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (docError) throw docError;
  if (!doc) throw new NotFoundError('Document');

  const { data: transactions } = await adminClient
    .from('accounting_transactions')
    .select('id, date, description, total_amount, currency, category_source, is_duplicate_flag, is_anomaly_flag, anomaly_note, tax_deduction_candidate, account:chart_of_accounts(id, code, name)')
    .eq('workspace_id', workspaceId)
    .eq('document_id', documentId)
    .order('date', { ascending: true });

  const { data: receipts } = await adminClient
    .from('document_receipts')
    .select('id, vendor, receipt_date, amount, note, matched_transaction_id, tax_deduction_candidate')
    .eq('workspace_id', workspaceId)
    .eq('document_id', documentId);

  const txList = transactions || [];
  const totalIncome = txList.filter(t => Number(t.total_amount) > 0).reduce((s, t) => s + Number(t.total_amount), 0);
  const totalExpenses = txList.filter(t => Number(t.total_amount) < 0).reduce((s, t) => s + Math.abs(Number(t.total_amount)), 0);
  const duplicates = txList.filter(t => t.is_duplicate_flag);
  const anomalies = txList.filter(t => t.is_anomaly_flag);
  const taxCandidates = [
    ...txList.filter(t => t.tax_deduction_candidate),
    ...(receipts || []).filter(r => r.tax_deduction_candidate),
  ];

  return {
    document: doc,
    transactions: txList,
    receipts: receipts || [],
    summary: {
      totalIncome,
      totalExpenses,
      net: totalIncome - totalExpenses,
      transactionCount: txList.length,
      duplicateCount: duplicates.length,
      anomalyCount: anomalies.length,
      taxCandidateCount: taxCandidates.length,
    },
    disclaimer: BOOKKEEPING_DISCLAIMER,
  };
}
