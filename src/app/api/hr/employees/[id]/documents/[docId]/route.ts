import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;

export async function DELETE(req: NextRequest, { params }: { params: { id: string; docId: string } }) {
  try {
    const { id: employeeId, docId } = params
    const { workspaceId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    const { data: doc, error: fetchError } = await adminClient
      .from('employee_documents')
      .select('id, storage_path')
      .eq('id', docId)
      .eq('employee_id', employeeId)
      .eq('workspace_id', workspaceId)
      .maybeSingle()

    if (fetchError) throw fetchError;
    if (!doc) throw new NotFoundError('Document');

    // Delete the DB record first — if storage removal then fails, we're left with an
    // orphaned blob (recoverable via a cleanup sweep) rather than a record pointing at
    // nothing, which is the worse failure mode (a "document" the UI shows but can't serve).
    const { error: deleteError } = await adminClient
      .from('employee_documents')
      .delete()
      .eq('id', docId)
      .eq('workspace_id', workspaceId)

    if (deleteError) throw deleteError;

    const { error: storageError } = await adminClient.storage
      .from('employee-documents')
      .remove([doc.storage_path])

    if (storageError) {
      logger.error({ err: storageError, docId, storagePath: doc.storage_path }, 'hr.employee_documents.delete.storage_cleanup.failed');
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    logger.error({ err }, 'hr.employee_documents.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
