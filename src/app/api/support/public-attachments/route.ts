import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'text/plain',
  'application/zip'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const workspaceId = formData.get('workspaceId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID required' }, { status: 400 });
    }

    // Validation checks
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 25MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    // Generate clean filename and storage path
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${workspaceId}/widget/${Date.now()}_${cleanFileName}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Upload to private Supabase Storage bucket using service role client
    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from('support-ticket-files')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    // Generate a long-lived temporary signed URL for viewing the attachment
    const { data: urlData } = await supabaseAdmin.storage
      .from('support-ticket-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365); // 1 year expiry

    return NextResponse.json({
      success: true,
      fileUrl: urlData?.signedUrl,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storagePath
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
