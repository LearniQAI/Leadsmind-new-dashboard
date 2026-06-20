import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const pathPrefix = (formData.get('pathPrefix') as string) || 'lms-assets';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${pathPrefix}/${Date.now()}-${cleanFileName}`;

    // Upload to 'media' bucket
    const { error: uploadError } = await supabaseAdmin.storage
      .from('media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Storage upload failed: ' + uploadError.message }, { status: 500 });
    }

    // Generate public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('media')
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
      name: file.name,
      size: file.size,
      mimeType: file.type
    });
  } catch (err: any) {
    console.error('[POST /api/lms/upload error]:', err);
    return NextResponse.json({ error: err.message || 'Failed to upload asset' }, { status: 500 });
  }
}
