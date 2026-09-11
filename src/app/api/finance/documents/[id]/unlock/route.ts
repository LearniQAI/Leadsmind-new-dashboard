import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth';
import { getDocumentEncryptionKey, decryptBuffer } from '@/lib/storage/encryptedDocuments';
import { extractPdfText, PdfPasswordRequiredError } from '@/lib/finance/pdfStatementParser';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

/**
 * Unlocks a password-protected PDF the worker previously flagged. The password is used
 * transiently in-memory for this single request only — it is never written to the DB, logs,
 * or storage, and goes out of scope the moment this handler returns.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { workspaceId } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { password } = await req.json();
    if (!password || typeof password !== 'string') {
      return NextResponse.json({ error: 'password is required' }, { status: 400 });
    }

    const { data: doc, error: docError } = await adminClient
      .from('financial_documents')
      .select('id, storage_path, mime_type, status, encryption_iv, encryption_auth_tag')
      .eq('id', params.id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (docError) throw docError;
    if (!doc) throw new NotFoundError('Document');
    if (doc.status !== 'password_protected') {
      return NextResponse.json({ error: 'This document is not waiting on a password' }, { status: 400 });
    }

    const { data: blob, error: downloadError } = await adminClient.storage
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

    try {
      const result = await extractPdfText(plainBuffer, password);
      await adminClient
        .from('financial_documents')
        .update({ status: 'processed', extracted_text: result.text, error_message: null })
        .eq('id', doc.id);

      return NextResponse.json({ success: true, status: 'processed' });
    } catch (err) {
      if (err instanceof PdfPasswordRequiredError) {
        return NextResponse.json({ error: 'Incorrect password — please try again.' }, { status: 400 });
      }
      throw err;
    }
  } catch (err: any) {
    logger.error({ err, documentId: params.id }, 'finance.documents.unlock.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
