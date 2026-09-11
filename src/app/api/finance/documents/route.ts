import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getDocumentEncryptionKey, encryptBuffer } from '@/lib/storage/encryptedDocuments';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// CSV is deliberately excluded here — it already has a real, working immediate-import path
// (client-side parse -> POST /api/finance/transactions, connected-accounts/page.tsx) that
// this session isn't touching. This endpoint is for the document types that need async
// processing: PDF statements, receipt/invoice images, and XLSX (queued but honestly failed
// in Session A — see the cron worker — since real XLSX parsing isn't built yet).
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB, matches kyc-documents / employee-documents

export async function GET(req: NextRequest) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { data, error } = await adminClient
      .from('financial_documents')
      .select('id, file_name, file_size, mime_type, document_kind, status, error_message, created_at')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ documents: data ?? [] });
  } catch (err: any) {
    logger.error({ err }, 'finance.documents.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { workspaceId, userId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const documentKind = (formData.get('documentKind') as string | null) || 'other';
    const notifyEmailRaw = (formData.get('notifyEmail') as string | null)?.trim() || null;

    if (!file) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 15MB size limit' }, { status: 400 });
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type "${file.type}" is not supported here. Allowed: PDF, PNG, JPEG, XLSX. Upload CSV statements via the CSV import option instead.` },
        { status: 400 }
      );
    }
    if (!['bank_statement', 'receipt', 'invoice', 'other'].includes(documentKind)) {
      return NextResponse.json({ error: 'Invalid documentKind' }, { status: 400 });
    }
    // Basic format validation only — this app has no existing precedent for a caller-supplied
    // destination email, and there's no ownership/verification step here (real limitation,
    // documented in the Session A/B build notes): anyone who can upload to this workspace can
    // direct the notification anywhere. Acceptable for a same-workspace-only summary email,
    // not for anything more sensitive than that.
    if (notifyEmailRaw && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmailRaw)) {
      return NextResponse.json({ error: 'notifyEmail is not a valid email address' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const { encryptedBuffer, iv, authTag } = encryptBuffer(fileBuffer, getDocumentEncryptionKey());

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${workspaceId}/${Date.now()}-${cleanFileName}.enc`;

    const { error: uploadError } = await adminClient.storage
      .from('financial-documents')
      .upload(storagePath, encryptedBuffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      logger.error({ err: uploadError, workspaceId }, 'finance.documents.upload.storage.failed');
      throw new Error('File upload storage failure');
    }

    const { data: docRecord, error: insertError } = await adminClient
      .from('financial_documents')
      .insert({
        workspace_id: workspaceId,
        uploaded_by: userId,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        document_kind: documentKind,
        status: 'uploaded',
        notify_email: notifyEmailRaw,
        encryption_iv: iv.toString('hex'),
        encryption_auth_tag: authTag.toString('hex'),
        encryption_algorithm: 'aes-256-gcm',
      })
      .select('id, file_name, file_size, mime_type, document_kind, status, created_at')
      .single();

    if (insertError) {
      // Same orphan-cleanup convention as the KYC/employee-document upload routes.
      await adminClient.storage.from('financial-documents').remove([storagePath]);
      logger.error({ err: insertError, workspaceId }, 'finance.documents.upload.db_insert.failed');
      throw insertError;
    }

    const { error: jobError } = await adminClient.from('document_processing_jobs').insert({
      workspace_id: workspaceId,
      document_id: docRecord.id,
      status: 'pending',
    });
    if (jobError) {
      logger.error({ err: jobError, documentId: docRecord.id }, 'finance.documents.job_enqueue.failed');
      // The document is safely stored either way — surface it as uploaded-but-not-yet-queued
      // rather than failing the whole upload over a queue-row insert error.
    }

    return NextResponse.json({ success: true, document: docRecord });
  } catch (err: any) {
    logger.error({ err }, 'finance.documents.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
