import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getUser, getUserRoleForWorkspace } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { enrolmentInactiveReason } from '@/lib/lms/enrolment';
import { googleDriveLinkProvider } from '@/lib/lms/audio/googleDriveLinkProvider';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Access-gated proxy: never exposes the raw Drive link to the client. Since one audio_assets
// row can now be attached to MANY content_blocks (real "one audio file, many uses" — see
// 20260923100002_lms_audio_asset_reuse.sql), the asset id ALONE no longer determines a unique
// course/lesson to gate against. The caller must say which attachment it's playing through
// (?contentBlockId=) — resolved and verified as a REAL attachment of this asset before any
// enrolment check runs, so a request can't claim an unrelated content_block_id to borrow its
// access. Runs the same isEnrolmentActive check every other content-access path uses — a
// non-enrolled or inactive-enrolment request gets 403 before a single byte is streamed.
// Workspace staff (instructor/admin) can preview without an enrolment row, same as the player's
// other preview paths.
async function resolveAccess(assetId: string, contentBlockId: string | null) {
  const adminClient = createAdminClient();

  if (!contentBlockId) {
    return { error: 'Missing contentBlockId', status: 400 } as const;
  }

  const { data: attachment, error } = await adminClient
    .from('audio_asset_attachments')
    .select(
      'audio_asset_id, content_blocks!inner(id, lesson_id, course_lessons!inner(id, course_id, workspace_id))'
    )
    .eq('audio_asset_id', assetId)
    .eq('content_block_id', contentBlockId)
    .maybeSingle();
  if (error) throw error;
  if (!attachment) return { error: 'Audio not found', status: 404 } as const;

  const { data: asset, error: assetErr } = await adminClient
    .from('audio_assets')
    .select('id, google_drive_file_id, status')
    .eq('id', assetId)
    .maybeSingle();
  if (assetErr) throw assetErr;
  if (!asset) return { error: 'Audio not found', status: 404 } as const;

  const lesson = (attachment as any).content_blocks.course_lessons;
  const workspaceId: string = lesson.workspace_id;
  const courseId: string = lesson.course_id;

  const user = await getUser();
  if (!user) return { error: 'Unauthorized', status: 401 } as const;

  const staffRole = await getUserRoleForWorkspace(workspaceId);
  if (staffRole) {
    return { asset, ok: true } as const;
  }

  const contactId = await getOrCreateStudentContact(workspaceId);
  if (!contactId) return { error: 'Forbidden', status: 403 } as const;

  const { data: enrollment } = await adminClient
    .from('enrollments')
    .select('status, active, expires_at, grace_period_expires_at')
    .eq('contact_id', contactId)
    .eq('course_id', courseId)
    .maybeSingle();

  const inactiveReason = enrolmentInactiveReason(enrollment);
  if (inactiveReason) return { error: inactiveReason, status: 403 } as const;

  return { asset, ok: true } as const;
}

function parseRange(header: string | null): { start: number; end?: number } | undefined {
  if (!header) return undefined;
  const match = /^bytes=(\d+)-(\d*)$/.exec(header.trim());
  if (!match) return undefined;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : undefined;
  if (!Number.isFinite(start)) return undefined;
  return { start, end };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contentBlockId = req.nextUrl.searchParams.get('contentBlockId');
    const access = await resolveAccess(id, contentBlockId);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const fileId = (access.asset as any).google_drive_file_id;

    const range = parseRange(req.headers.get('range'));
    const stream = await googleDriveLinkProvider.getStream(fileId, range);

    return new NextResponse(stream.body as any, {
      status: stream.status,
      headers: stream.headers,
    });
  } catch (err: any) {
    logger.error({ err, params }, 'lms.audio.stream.failed');
    return NextResponse.json({ error: 'Failed to stream audio' }, { status: 500 });
  }
}

export async function HEAD(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const contentBlockId = req.nextUrl.searchParams.get('contentBlockId');
    const access = await resolveAccess(id, contentBlockId);
    if (!access.ok) {
      return new NextResponse(null, { status: access.status });
    }
    const fileId = (access.asset as any).google_drive_file_id;

    // Drive has no true HEAD support — request a 1-byte range to surface Content-Range (and
    // therefore total size) without pulling the whole file.
    const stream = await googleDriveLinkProvider.getStream(fileId, { start: 0, end: 0 });
    const headers = { ...stream.headers };
    delete headers['content-length'];
    return new NextResponse(null, { status: 200, headers });
  } catch (err: any) {
    logger.error({ err, params }, 'lms.audio.stream.head_failed');
    return new NextResponse(null, { status: 500 });
  }
}
