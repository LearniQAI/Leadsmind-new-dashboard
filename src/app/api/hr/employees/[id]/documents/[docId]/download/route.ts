import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { getDocumentEncryptionKey, decryptBuffer } from '@/lib/storage/encryptedDocuments'
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;

export async function GET(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const { id: employeeId, docId } = params
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const { data: employee, error: empErr } = await adminClient
      .from('employees')
      .select('id, email')
      .eq('id', employeeId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (empErr) throw empErr;
    if (!employee) throw new NotFoundError('Employee');

    // Self-access: same rule as the list route — an employee can download their own
    // documents, everyone else needs an HR/admin/owner role.
    if (!ALLOWED_HR_ROLES.includes(role as any) && employee.email !== userEmail) {
      throw new ForbiddenError('You do not have access to this document');
    }

    const { data: doc, error: docErr } = await adminClient
      .from('employee_documents')
      .select('*')
      .eq('id', docId)
      .eq('employee_id', employeeId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()
    if (docErr) throw docErr;
    if (!doc) throw new NotFoundError('Document');

    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('employee-documents')
      .download(doc.storage_path)

    if (downloadError || !fileData) {
      logger.error({ err: downloadError, docId }, 'hr.employee_documents.download.storage_failure');
      throw new Error('Failed to retrieve storage payload');
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const encryptedBuffer = Buffer.from(arrayBuffer)

    const decryptedBuffer = decryptBuffer(
      encryptedBuffer,
      getDocumentEncryptionKey(),
      Buffer.from(doc.encryption_iv, 'hex'),
      Buffer.from(doc.encryption_auth_tag, 'hex')
    )

    return new NextResponse(new Uint8Array(decryptedBuffer), {
      headers: {
        'Content-Type': doc.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${doc.file_name}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err: any) {
    logger.error({ err }, 'hr.employee_documents.download.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
