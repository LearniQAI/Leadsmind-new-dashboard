import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { requireWorkspaceRole } from '@/lib/api/workspaceAuth'
import { getDocumentEncryptionKey, encryptBuffer } from '@/lib/storage/encryptedDocuments'
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError'
import { logger } from '@/shared/logger'

export const dynamic = 'force-dynamic';

const ALLOWED_HR_ROLES = ['admin', 'owner', 'hr'] as const;
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'application/octet-stream'];
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB, matches the employee-documents bucket's own limit

// Confirms the employee exists in this workspace and returns it, or throws NotFoundError.
// Shared by every handler below so "wrong employee id" and "wrong workspace" both 404
// the same way, rather than leaking which one it was.
async function loadEmployee(adminClient: ReturnType<typeof createAdminClient>, employeeId: string, workspaceId: string) {
  const { data: employee, error } = await adminClient
    .from('employees')
    .select('id, email, status')
    .eq('id', employeeId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()
  if (error) throw error;
  if (!employee) throw new NotFoundError('Employee');
  return employee;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id
    const { workspaceId, role, userEmail } = await requireWorkspaceRole();
    const adminClient = createAdminClient();

    const employee = await loadEmployee(adminClient, employeeId, workspaceId)

    // Self-access: an employee who isn't HR/admin/owner can only list their own documents
    // — same convention already established by GET /api/hr/warnings.
    if (!ALLOWED_HR_ROLES.includes(role as any) && employee.email !== userEmail) {
      throw new ForbiddenError('You do not have access to this employee\'s documents');
    }

    const { data, error } = await adminClient
      .from('employee_documents')
      .select('id, label, category, file_name, file_size, mime_type, uploaded_by, created_at')
      .eq('employee_id', employeeId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error;
    return NextResponse.json({ documents: data ?? [] })
  } catch (err: any) {
    logger.error({ err }, 'hr.employee_documents.get.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const employeeId = params.id
    const { workspaceId, userId } = await requireWorkspaceRole(ALLOWED_HR_ROLES);
    const adminClient = createAdminClient();

    await loadEmployee(adminClient, employeeId, workspaceId)

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const label = formData.get('label') as string | null
    const category = formData.get('category') as string | null

    if (!file || !label) {
      return NextResponse.json({ error: 'file and label are required' }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File exceeds the 15MB size limit' }, { status: 400 })
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `File type "${file.type}" is not allowed. Allowed: PDF, PNG, JPEG.` }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    const { encryptedBuffer, iv, authTag } = encryptBuffer(fileBuffer, getDocumentEncryptionKey())

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `employees/${employeeId}/${Date.now()}-${cleanFileName}.enc`

    const { error: uploadError } = await adminClient.storage
      .from('employee-documents')
      .upload(storagePath, encryptedBuffer, {
        contentType: 'application/octet-stream',
        upsert: true,
      })

    if (uploadError) {
      logger.error({ err: uploadError, employeeId, workspaceId }, 'hr.employee_documents.upload.storage.failed');
      throw new Error('File upload storage failure');
    }

    const { data: docRecord, error: insertError } = await adminClient
      .from('employee_documents')
      .insert({
        workspace_id: workspaceId,
        employee_id: employeeId,
        label,
        category: category || null,
        file_name: file.name,
        storage_path: storagePath,
        file_size: file.size,
        mime_type: file.type,
        encryption_iv: iv.toString('hex'),
        encryption_auth_tag: authTag.toString('hex'),
        encryption_algorithm: 'aes-256-gcm',
        uploaded_by: userId,
      })
      .select('id, label, category, file_name, file_size, mime_type, uploaded_by, created_at')
      .single()

    if (insertError) {
      // Cleanup the uploaded storage asset on DB write failures, same pattern as
      // /api/kyc/documents/upload — never leave an orphaned encrypted blob with no
      // metadata record pointing at it (or at the terminated-employee trigger rejection).
      await adminClient.storage.from('employee-documents').remove([storagePath])
      logger.error({ err: insertError, employeeId, workspaceId }, 'hr.employee_documents.upload.db_insert.failed');
      throw insertError;
    }

    return NextResponse.json({ success: true, document: docRecord })
  } catch (err: any) {
    logger.error({ err }, 'hr.employee_documents.post.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
