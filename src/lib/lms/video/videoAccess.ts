import { createAdminClient } from '@/lib/supabase/server';
import { getUser, getUserRoleForWorkspace } from '@/lib/auth';
import { getOrCreateStudentContact } from '@/app/actions/studentEnrollments';
import { enrolmentInactiveReason } from '@/lib/lms/enrolment';

export type VideoAccess =
  | { ok: true; fileId: string }
  | { ok: false; error: string; status: 400 | 401 | 403 | 404 };

// Access gate shared by the Drive video stream and poster routes — the raw Drive file id never
// reaches the client; every byte goes through here first. Same shape as the audio stream gate
// (/api/audio/[id]/stream): the caller names the content block it's playing through, and that
// block must genuinely point at this asset (content_blocks.video_asset_id) before any
// enrolment check runs, so a request can't borrow an unrelated block's access. The asset's own
// workspace must match the lesson's, too (the validate route only ever writes same-workspace
// pairs; this is the belt-and-braces check against a hand-edited row).
//
// Who gets bytes:
//   - A free-preview lesson (is_preview AND is_active) — anyone, signed in or not. This is exactly
//     resolveCoursePreview()'s rule for shipping a lesson's content to a viewer with no enrolment
//     (/preview/courses/[id] and the not-enrolled branch of the player page), so a Drive video in
//     a preview lesson plays there instead of failing with a 401.
//   - Workspace staff (any role) — builder canvas, settings-panel preview, instructor preview.
//   - A student with an ACTIVE enrolment in the lesson's course (enrolmentInactiveReason, the same
//     predicate every other content-access path uses).
export async function resolveVideoAccess(assetId: string, contentBlockId: string | null): Promise<VideoAccess> {
  if (!contentBlockId) return { ok: false, error: 'Missing contentBlockId', status: 400 };

  const adminClient = createAdminClient();

  const { data: block, error: blockErr } = await adminClient
    .from('content_blocks')
    .select('id, video_asset_id, course_lessons!inner(id, course_id, workspace_id, is_preview, is_active)')
    .eq('id', contentBlockId)
    .eq('video_asset_id', assetId)
    .maybeSingle();
  if (blockErr) throw blockErr;
  if (!block) return { ok: false, error: 'Video not found', status: 404 };

  const lesson = (block as any).course_lessons as {
    course_id: string;
    workspace_id: string;
    is_preview: boolean | null;
    is_active: boolean | null;
  };

  const { data: asset, error: assetErr } = await adminClient
    .from('video_assets')
    .select('id, workspace_id, google_drive_file_id')
    .eq('id', assetId)
    .maybeSingle();
  if (assetErr) throw assetErr;
  if (!asset || asset.workspace_id !== lesson.workspace_id) {
    return { ok: false, error: 'Video not found', status: 404 };
  }

  if (lesson.is_preview === true && lesson.is_active !== false) {
    return { ok: true, fileId: asset.google_drive_file_id };
  }

  const user = await getUser();
  if (!user) return { ok: false, error: 'Unauthorized', status: 401 };

  const staffRole = await getUserRoleForWorkspace(lesson.workspace_id);
  if (staffRole) return { ok: true, fileId: asset.google_drive_file_id };

  const contactId = await getOrCreateStudentContact(lesson.workspace_id);
  if (!contactId) return { ok: false, error: 'Forbidden', status: 403 };

  const { data: enrollment } = await adminClient
    .from('enrollments')
    .select('status, active, expires_at, grace_period_expires_at')
    .eq('contact_id', contactId)
    .eq('course_id', lesson.course_id)
    .maybeSingle();

  const inactiveReason = enrolmentInactiveReason(enrollment);
  if (inactiveReason) return { ok: false, error: inactiveReason, status: 403 };

  return { ok: true, fileId: asset.google_drive_file_id };
}
