import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/shared/logger';
import { getDocumentEncryptionKey, decryptBuffer } from '@/lib/storage/encryptedDocuments';
import { extractPdfText, isTextLayerUnreliable, PdfPasswordRequiredError } from '@/lib/finance/pdfStatementParser';
import {
  structureTransactionsFromText,
  structureTransactionsFromImage,
  extractReceiptFromImage,
  insertTransactionsWithFlags,
  reconcileReceipt,
  runCreditGuard,
  consumeAICredit,
} from '@/lib/finance/bookkeepingEngine';
import { sendDocumentProcessedEmail } from '@/lib/finance/documentNotification';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Worker for the document_processing_jobs queue (AI Bookkeeping). Same pending -> processing
// -> done|failed shape as processEmailQueue() in libs/infra/src/queues/email-queue.ts: fetch
// pending rows, claim each via a conditional UPDATE (loses the race gracefully if another
// invocation already claimed it), process, write the terminal state.
//
// Session B adds: structured transaction extraction + AI-suggested categorization (metered
// via runCreditGuard/consumeAICredit, same as every other AI feature in this app), anomaly/
// tax-candidate flags, receipt<->transaction reconciliation, and a completion email. XLSX
// stays an honest, un-built failure — real parsing for it was never built in either session.
async function processDocumentJobs(batchSize: number = 10) {
  const { data: jobs, error } = await supabaseAdmin
    .from('document_processing_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(batchSize);

  if (error) {
    logger.error({ err: error }, 'cron.document_processing.fetch.failed');
    return { processed: 0, error: error.message };
  }
  if (!jobs || jobs.length === 0) {
    return { processed: 0 };
  }

  let done = 0;
  let failed = 0;

  for (const job of jobs) {
    const { data: claimed } = await supabaseAdmin
      .from('document_processing_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();
    if (!claimed) continue; // another invocation already claimed it

    try {
      const { data: doc, error: docError } = await supabaseAdmin
        .from('financial_documents')
        .select('id, workspace_id, storage_path, mime_type, document_kind, encryption_iv, encryption_auth_tag')
        .eq('id', job.document_id)
        .maybeSingle();
      if (docError) throw docError;
      if (!doc) throw new Error('Document record not found');

      await supabaseAdmin.from('financial_documents').update({ status: 'processing' }).eq('id', doc.id);

      const { data: blob, error: downloadError } = await supabaseAdmin.storage
        .from('financial-documents')
        .download(doc.storage_path);
      if (downloadError || !blob) throw downloadError || new Error('Could not download document');

      const encryptedBuffer = Buffer.from(await blob.arrayBuffer());
      const plainBuffer = decryptBuffer(
        encryptedBuffer,
        getDocumentEncryptionKey(),
        Buffer.from(doc.encryption_iv, 'hex'),
        Buffer.from(doc.encryption_auth_tag, 'hex')
      );

      const { data: accounts } = await supabaseAdmin
        .from('chart_of_accounts')
        .select('id, code, name, type')
        .eq('workspace_id', doc.workspace_id);

      let txCount = 0;
      let receiptExtracted = false;
      let gapMonths: string[] = [];
      let creditBlocked = false;

      if (doc.mime_type === 'application/pdf') {
        try {
          const result = await extractPdfText(plainBuffer);
          if (isTextLayerUnreliable(result)) {
            await supabaseAdmin
              .from('financial_documents')
              .update({
                status: 'failed',
                error_message: 'Could not extract readable text from this PDF (likely a scanned image). Try a text-based PDF, or a clearer photo (image upload uses vision extraction) or CSV export.',
              })
              .eq('id', doc.id);
          } else {
            const guard = await runCreditGuard(doc.workspace_id);
            if (guard.ok === false) {
              creditBlocked = true;
              await supabaseAdmin
                .from('financial_documents')
                .update({ status: 'processed', extracted_text: result.text, error_message: 'AI credit limit reached — raw text saved, categorization skipped. Re-run once credits are available.' })
                .eq('id', doc.id);
            } else {
              const structured = await structureTransactionsFromText(result.text, accounts || []);
              const { inserted, gapMonths: gaps } = await insertTransactionsWithFlags(
                supabaseAdmin as any,
                doc.workspace_id,
                doc.id,
                structured.transactions,
                accounts || []
              );
              await consumeAICredit(doc.workspace_id, 1);
              txCount = inserted.length;
              gapMonths = gaps;
              await supabaseAdmin
                .from('financial_documents')
                .update({ status: 'processed', extracted_text: result.text, error_message: null })
                .eq('id', doc.id);
            }
          }
        } catch (err) {
          if (err instanceof PdfPasswordRequiredError) {
            await supabaseAdmin
              .from('financial_documents')
              .update({ status: 'password_protected', error_message: 'password_required' })
              .eq('id', doc.id);
          } else {
            throw err;
          }
        }
      } else if (doc.mime_type === 'image/png' || doc.mime_type === 'image/jpeg') {
        const guard = await runCreditGuard(doc.workspace_id);
        if (guard.ok === false) {
          creditBlocked = true;
          await supabaseAdmin
            .from('financial_documents')
            .update({ status: 'failed', error_message: 'AI credit limit reached — this image could not be processed. Re-upload once credits are available.' })
            .eq('id', doc.id);
        } else if (doc.document_kind === 'receipt' || doc.document_kind === 'invoice') {
          const imageBase64 = plainBuffer.toString('base64');
          const receipt = await extractReceiptFromImage(imageBase64, doc.mime_type);
          await consumeAICredit(doc.workspace_id, 1);
          const taxCandidate = receipt.note ? /software|rent|utilit|advertis|travel|professional|insurance|office/i.test(receipt.note) : false;
          const { data: receiptRow } = await supabaseAdmin
            .from('document_receipts')
            .insert({
              workspace_id: doc.workspace_id,
              document_id: doc.id,
              vendor: receipt.vendor,
              receipt_date: receipt.date,
              amount: receipt.amount,
              note: receipt.note,
              tax_deduction_candidate: taxCandidate,
            })
            .select()
            .single();
          if (receiptRow) await reconcileReceipt(supabaseAdmin as any, doc.workspace_id, receiptRow);
          receiptExtracted = true;
          await supabaseAdmin
            .from('financial_documents')
            .update({ status: 'processed', extracted_text: JSON.stringify(receipt), error_message: null })
            .eq('id', doc.id);
        } else {
          // A bank-statement-kind image (e.g. a photographed statement) — same vision path,
          // producing transaction rows instead of a single receipt.
          const imageBase64 = plainBuffer.toString('base64');
          const structured = await structureTransactionsFromImage(imageBase64, doc.mime_type, accounts || []);
          const { inserted, gapMonths: gaps } = await insertTransactionsWithFlags(
            supabaseAdmin as any,
            doc.workspace_id,
            doc.id,
            structured.transactions,
            accounts || []
          );
          await consumeAICredit(doc.workspace_id, 1);
          txCount = inserted.length;
          gapMonths = gaps;
          await supabaseAdmin
            .from('financial_documents')
            .update({ status: 'processed', extracted_text: null, error_message: null })
            .eq('id', doc.id);
        }
      } else if (doc.mime_type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        await supabaseAdmin
          .from('financial_documents')
          .update({
            status: 'failed',
            error_message: 'XLSX parsing is not available yet — please export this statement as CSV or PDF instead.',
          })
          .eq('id', doc.id);
      } else {
        await supabaseAdmin
          .from('financial_documents')
          .update({ status: 'failed', error_message: `Unsupported file type: ${doc.mime_type}` })
          .eq('id', doc.id);
      }

      if (!creditBlocked) {
        await sendDocumentProcessedEmail(supabaseAdmin as any, doc.id, { txCount, receiptExtracted, gapMonths });
      }

      await supabaseAdmin
        .from('document_processing_jobs')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .eq('id', job.id);
      done++;
    } catch (err: any) {
      logger.error({ err, jobId: job.id }, 'cron.document_processing.job.failed');
      const attempts = (job.attempts || 0) + 1;
      const nextStatus = attempts >= 3 ? 'failed' : 'pending';
      await supabaseAdmin
        .from('document_processing_jobs')
        .update({ status: nextStatus, attempts, error_message: err.message, processed_at: new Date().toISOString() })
        .eq('id', job.id);
      if (nextStatus === 'failed') {
        await supabaseAdmin
          .from('financial_documents')
          .update({ status: 'failed', error_message: err.message })
          .eq('id', job.document_id);
      }
      failed++;
    }
  }

  return { processed: jobs.length, done, failed };
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) throw new Error('[FATAL] CRON_SECRET env var is not configured');
  if (req.headers.get('Authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processDocumentJobs();
  logger.info(result, 'cron.document_processing.done');
  return NextResponse.json({ success: true, ...result });
}

export async function POST(req: Request) {
  return GET(req);
}
