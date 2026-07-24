import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { assertContactAccessOrPortalSelf } from '@/lib/kyc/access';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Retrieve and hash the encryption key to guarantee it is exactly 32 bytes (256 bits) for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.KYC_ENCRYPTION_KEY || 'default_secret_compliance_key_32_bytes')
  .digest();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contactId = formData.get('contactId') as string;
    const documentType = formData.get('documentType') as string;
    const file = formData.get('file') as File;
    // workspaceId is intentionally read-and-ignored below — the contact's real workspace_id
    // (resolved server-side inside assertContactAccessOrPortalSelf) is the only source of
    // truth. A client-supplied workspaceId is never trusted for authorization.

    if (!contactId || !documentType || !file) {
      return NextResponse.json({ error: 'Missing required payload parameters' }, { status: 400 });
    }

    // Auth: caller must be an internal team member of the contact's real workspace, OR the
    // portal-authenticated contact themself (scoped to exactly this contact, not their whole
    // workspace). Runs BEFORE any storage or DB write. Throws Unauthorized/Forbidden/NotFound
    // as appropriate.
    const { contact } = await assertContactAccessOrPortalSelf(contactId);
    const workspaceId = contact.workspace_id;

    const adminClient = createAdminClient();

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate random 16-byte initialization vector (IV) for CBC mode
    const iv = crypto.randomBytes(16);

    // Encrypt using AES-256-CBC
    const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const encryptedBuffer = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);

    // Construct path under bucket: contacts/[contactId]/[timestamp]-[cleanName].enc
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `contacts/${contactId}/${Date.now()}-${cleanFileName}.enc`;

    // Upload encrypted payload to 'kyc-documents' bucket
    const { error: uploadError } = await adminClient.storage
      .from('kyc-documents')
      .upload(storagePath, encryptedBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      logger.error({ err: uploadError, contactId, workspaceId }, 'kyc.documents.upload.storage.failed');
      throw new Error('File upload storage failure');
    }

    // Calculate FICA retention delete date (5 years from now)
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() + 5);

    // Compute document expiry. Proof of Address (utility_bill) defaults to 3 months from now
    let expiryDate: string | null = null;
    if (documentType === 'utility_bill') {
      const exp = new Date();
      exp.setMonth(exp.getMonth() + 3);
      expiryDate = exp.toISOString();
    }

    // Insert metadata record in kyc_documents — workspace_id is always the resolved,
    // server-verified value, never the client-supplied form field.
    const { data: docRecord, error: insertError } = await adminClient
      .from('kyc_documents')
      .insert({
        workspace_id: workspaceId,
        contact_id: contactId,
        document_type: documentType,
        file_url: storagePath,
        expiry_date: expiryDate,
        retention_delete_after: retentionDate.toISOString(),
        encryption_iv: iv.toString('hex')
      })
      .select()
      .single();

    if (insertError) {
      // Cleanup the uploaded storage asset on DB write failures
      await adminClient.storage.from('kyc-documents').remove([storagePath]);
      logger.error({ err: insertError, contactId, workspaceId }, 'kyc.documents.upload.db_insert.failed');
      throw new Error('Failed to record document in compliance log');
    }

    // Log user activity
    await adminClient.from('contact_activities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: 'system',
      description: `Uploaded and encrypted FICA document (${documentType.replace(/_/g, ' ').toUpperCase()})`
    });

    return NextResponse.json({ success: true, document: docRecord });
  } catch (err: any) {
    logger.error({ err }, 'kyc.documents.upload.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
