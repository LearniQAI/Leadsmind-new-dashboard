import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Used both by instructors uploading course assets and students uploading assignment
// files — any authenticated user may call this. It previously accepted a fully
// client-controlled `pathPrefix` used verbatim in the storage path, so any authenticated
// user (from any workspace) could write into any other workspace's asset paths in the
// shared 'media' bucket. Every upload is now confined under the caller's own verified
// workspace id — pathPrefix (sanitized) only selects a sub-folder within that.
export async function POST(req: NextRequest) {
  try {
    const { userId, workspaceId } = await requireWorkspaceAccess();

    const adminClient = createAdminClient();

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const rawPathPrefix = (formData.get('pathPrefix') as string) || 'lms-assets';
    const cleanPathPrefix = rawPathPrefix.replace(/[^a-zA-Z0-9/_-]/g, '_').replace(/^\/+|\.\.+/g, '');

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `${workspaceId}/${cleanPathPrefix}/${Date.now()}-${cleanFileName}`;

    // Upload to 'media' bucket
    const { error: uploadError } = await adminClient.storage
      .from('media')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      });

    if (uploadError) {
      logger.error({ err: uploadError, userId }, 'lms.upload.storage.failed');
      throw new Error('Storage upload failed');
    }

    // Generate public URL
    const { data: { publicUrl } } = adminClient.storage
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
    logger.error({ err }, 'lms.upload.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
