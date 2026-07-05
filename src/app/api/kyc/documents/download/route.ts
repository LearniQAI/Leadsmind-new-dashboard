import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.KYC_ENCRYPTION_KEY || 'default_secret_compliance_key_32_bytes')
  .digest();

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Document id parameter is required' }, { status: 400 });
    }

    // Fetch document details from compliance log
    const { data: doc, error: fetchError } = await supabase
      .from('kyc_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json({ error: 'KYC Document metadata record not found' }, { status: 404 });
    }

    // Retrieve encrypted payload from bucket
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('kyc-documents')
      .download(doc.file_url);

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to retrieve storage payload: ' + downloadError?.message }, { status: 500 });
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
    console.error('[GET /api/kyc/documents/download error]:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred during decryption' }, { status: 500 });
  }
}
