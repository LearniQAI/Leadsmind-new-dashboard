import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Retrieve and hash the encryption key to guarantee it is exactly 32 bytes (256 bits) for AES-256
const ENCRYPTION_KEY = crypto.createHash('sha256')
  .update(process.env.KYC_ENCRYPTION_KEY || 'default_secret_compliance_key_32_bytes')
  .digest();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const contactId = formData.get('contactId') as string;
    const workspaceId = formData.get('workspaceId') as string;
    const documentType = formData.get('documentType') as string;
    const file = formData.get('file') as File;

    if (!contactId || !workspaceId || !documentType || !file) {
      return NextResponse.json({ error: 'Missing required payload parameters' }, { status: 400 });
    }

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
    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(storagePath, encryptedBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json({ error: 'File upload storage failure: ' + uploadError.message }, { status: 500 });
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

    // Insert metadata record in kyc_documents
    const { data: docRecord, error: insertError } = await supabase
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
      await supabase.storage.from('kyc-documents').remove([storagePath]);
      return NextResponse.json({ error: 'Failed to record document in compliance log: ' + insertError.message }, { status: 500 });
    }

    // Log user activity
    await supabase.from('contact_activities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      type: 'system',
      description: `Uploaded and encrypted FICA document (${documentType.replace(/_/g, ' ').toUpperCase()})`
    });

    return NextResponse.json({ success: true, document: docRecord });
  } catch (err: any) {
    console.error('[POST /api/kyc/documents/upload error]:', err);
    return NextResponse.json({ error: err.message || 'An unexpected error occurred during encryption' }, { status: 500 });
  }
}
