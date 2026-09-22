import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Used both by instructors uploading course assets and students uploading assignment
// files — any authenticated user may call this. Every upload is confined under the caller's
// own verified workspace id (pathPrefix, sanitized, only selects a sub-folder within that).
//
// Batch 1 / S8: uploads are now validated against a MIME + extension allowlist and a size cap,
// and student submissions (pathPrefix 'student-assignments') go to the PRIVATE
// 'lms-student-files' bucket under <workspace>/student-assignments/<userId>/…; the returned `url`
// is an authorising app URL (GET /api/lms/files) that redirects to a short-lived signed URL, so a
// student's homework is never reachable by a guessable public path. Instructor course assets and
// chat voice notes still use the public 'media' bucket (they are embedded in public pages).

const STUDENT_PREFIX = 'student-assignments';
const STUDENT_BUCKET = 'lms-student-files';
const PUBLIC_BUCKET = 'media';
const MAX_STUDENT_BYTES = 10 * 1024 * 1024;
const MAX_GENERAL_BYTES = 25 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain', csv: 'text/csv', zip: 'application/zip',
  mp3: 'audio/mpeg', wav: 'audio/wav', m4a: 'audio/mp4', ogg: 'audio/ogg', webm: 'audio/webm',
  mp4: 'video/mp4', mov: 'video/quicktime',
};

// Types a student may attach to an assignment / quiz answer (no video/quicktime).
const STUDENT_EXTS = new Set([
  'png', 'jpg', 'jpeg', 'webp', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip', 'mp3', 'wav', 'm4a', 'ogg', 'webm', 'mp4',
]);

// Browsers/clients may report a different-but-compatible type than our canonical one for the
// same extension (e.g. audio/webm vs video/webm for .webm, audio/x-m4a for .m4a).
const COMPATIBLE: Record<string, string[]> = {
  webm: ['audio/webm', 'video/webm'],
  m4a: ['audio/mp4', 'audio/x-m4a', 'audio/m4a', 'audio/aac'],
  mp3: ['audio/mpeg', 'audio/mp3'],
  wav: ['audio/wav', 'audio/x-wav', 'audio/wave'],
  jpg: ['image/jpeg', 'image/jpg'],
  jpeg: ['image/jpeg', 'image/jpg'],
  csv: ['text/csv', 'application/vnd.ms-excel'],
  zip: ['application/zip', 'application/x-zip-compressed'],
  mp4: ['video/mp4', 'audio/mp4'],
  ogg: ['audio/ogg', 'video/ogg'],
};

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i < 0 ? '' : name.slice(i + 1).toLowerCase();
}

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

    const isStudentUpload = cleanPathPrefix === STUDENT_PREFIX;

    // --- Validation: extension allowlist, declared-type consistency, size cap -------------------
    const ext = extOf(file.name);
    const canonicalMime = MIME_BY_EXT[ext];
    if (!canonicalMime || (isStudentUpload && !STUDENT_EXTS.has(ext))) {
      return NextResponse.json(
        { error: `File type ".${ext || 'unknown'}" is not allowed.`, code: 'UNSUPPORTED_FILE_TYPE' },
        { status: 415 }
      );
    }
    const declared = (file.type || '').split(';')[0].trim().toLowerCase();
    if (declared && declared !== canonicalMime && !(COMPATIBLE[ext] || []).includes(declared)) {
      return NextResponse.json(
        { error: 'File content type does not match its extension.', code: 'MIME_MISMATCH' },
        { status: 415 }
      );
    }
    const maxBytes = isStudentUpload ? MAX_STUDENT_BYTES : MAX_GENERAL_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File is too large (max ${Math.round(maxBytes / 1024 / 1024)} MB).`, code: 'FILE_TOO_LARGE' },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = isStudentUpload
      ? `${workspaceId}/${STUDENT_PREFIX}/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanFileName}`
      : `${workspaceId}/${cleanPathPrefix}/${Date.now()}-${cleanFileName}`;
    const bucket = isStudentUpload ? STUDENT_BUCKET : PUBLIC_BUCKET;

    const { error: uploadError } = await adminClient.storage
      .from(bucket)
      .upload(storagePath, fileBuffer, {
        contentType: canonicalMime,
        upsert: false,
      });

    if (uploadError) {
      logger.error({ err: uploadError, userId }, 'lms.upload.storage.failed');
      throw new Error('Storage upload failed');
    }

    // Student files: authorising app URL (never a public path). Everything else: public URL.
    const url = isStudentUpload
      ? `/api/lms/files?path=${encodeURIComponent(storagePath)}`
      : adminClient.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;

    // Surface instructor-uploaded lesson content in the workspace-wide Media
    // Center (it reads public.media_files). Only the `lms/*` prefixes are real
    // course assets an admin would want to manage there — `student-assignments`
    // (student homework) and `voicenotes` (chat) share this endpoint but are
    // deliberately excluded. A failure here must not fail the upload itself:
    // the object is already stored and the caller needs the URL back.
    if (cleanPathPrefix.startsWith('lms/')) {
      try {
        const kind = cleanPathPrefix.slice('lms/'.length).split('/')[0] || 'file';
        const kindLabel = kind.charAt(0).toUpperCase() + kind.slice(1);
        const { error: registerErr } = await adminClient.from('media_files').insert({
          workspace_id: workspaceId,
          name: file.name,
          path: storagePath,
          type: 'file',
          mime_type: canonicalMime,
          size: file.size,
          created_by: userId,
          metadata: {
            uploaded_via: `Lesson content — ${kindLabel}`,
            source_feature: 'lms_lesson_content',
            path_prefix: cleanPathPrefix,
          },
        });
        if (registerErr) {
          logger.error({ err: registerErr, userId, storagePath }, 'lms.upload.media_files.register.failed');
        }
      } catch (registerErr) {
        logger.error({ err: registerErr, userId, storagePath }, 'lms.upload.media_files.register.failed');
      }
    }

    return NextResponse.json({
      success: true,
      url,
      path: storagePath,
      name: file.name,
      size: file.size,
      mimeType: canonicalMime
    });
  } catch (err: any) {
    logger.error({ err }, 'lms.upload.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
