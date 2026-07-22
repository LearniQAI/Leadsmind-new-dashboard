import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getUser } from '@/lib/auth';
import { createAdminClient, createServerClient } from '@/lib/supabase/server';
import { UnauthorizedError, ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.KYC_ENCRYPTION_KEY || 'default_secret_compliance_key_32_bytes')
  .digest();

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      throw new UnauthorizedError();
    }

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Document id parameter is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Fetch document details from compliance log (admin client used only to resolve
    // the record's own workspace_id — access is still gated by the membership check below)
    const { data: doc, error: fetchError } = await adminClient
      .from('kyc_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      throw new NotFoundError('KYC document');
    }

    // Confirm the authenticated user is actually a member of the workspace that owns this document
    const supabaseUser = await createServerClient();
    const { data: membership } = await supabaseUser
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', doc.workspace_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      throw new ForbiddenError('You do not have access to this document');
    }

    // POPIA/FICA: only serve the document if the contact has an obtained consent record
    const { data: consent } = await adminClient
      .from('kyc_consent')
      .select('status')
      .eq('contact_id', doc.contact_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!consent || consent.status !== 'obtained') {
      throw new ForbiddenError('Consent has not been obtained for this contact');
    }

    // Retrieve encrypted payload from bucket
    const { data: fileData, error: downloadError } = await adminClient.storage
      .from('kyc-documents')
      .download(doc.file_url);

    if (downloadError || !fileData) {
      logger.error({ err: downloadError, docId: id }, 'kyc.document.download.storage_failure');
      throw new Error('Failed to retrieve storage payload');
    }

    // Convert Blob/file payload back to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const encryptedBuffer = Buffer.from(arrayBuffer);

    // Decrypt using document-specific IV
    const iv = Buffer.from(doc.encryption_iv, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    const decryptedBuffer = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

    // Parse clean filename and map correct Content-Type response headers
    const rawFileName = doc.file_url.split('/').pop() || 'document.bin';
    const cleanFileName = rawFileName.replace('.enc', '');
    
    let contentType = 'application/octet-stream';
    if (cleanFileName.toLowerCase().endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (cleanFileName.toLowerCase().endsWith('.png')) {
      contentType = 'image/png';
    } else if (cleanFileName.toLowerCase().endsWith('.jpg') || cleanFileName.toLowerCase().endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    }

    return new NextResponse(decryptedBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFileName}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (err: any) {
    logger.error({ err }, 'kyc.document.download.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
