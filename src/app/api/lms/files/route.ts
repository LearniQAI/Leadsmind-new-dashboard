import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { LMS_INSTRUCTOR_ROLES } from '@/lib/lms/access';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

// Authorising download for private student files (bucket 'lms-student-files', written by
// POST /api/lms/upload). Path layout: <workspaceId>/student-assignments/<uploaderUserId>/<file>.
// Allowed: the uploader themself, or an admin/member of that workspace (grading). Redirects to a
// 5-minute signed URL — the path itself never serves the file.
const BUCKET = 'lms-student-files';
const SIGNED_URL_TTL_SECONDS = 300;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const path = req.nextUrl.searchParams.get('path') || '';
    const parts = path.split('/');
    if (
      parts.length < 4 ||
      path.includes('..') ||
      !UUID.test(parts[0]) ||
      parts[1] !== 'student-assignments' ||
      !UUID.test(parts[2])
    ) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const [workspaceId, , uploaderId] = parts;

    let allowed = uploaderId === user.id;
    const admin = createAdminClient();
    if (!allowed) {
      const { data: membership } = await admin
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .maybeSingle();
      allowed = !!membership && (LMS_INSTRUCTOR_ROLES as readonly string[]).includes(membership.role);
    }
    if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) return NextResponse.json({ error: 'File not found' }, { status: 404 });

    const res = NextResponse.redirect(data.signedUrl, 302);
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (err) {
    logger.error({ err }, 'lms.files.failed');
    return NextResponse.json({ error: 'Failed to load file' }, { status: 500 });
  }
}
