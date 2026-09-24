import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { advancedAuthoringLockedResponse } from '@/lib/lms/audio/advancedAuthoringGuard';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const locked = await advancedAuthoringLockedResponse();
  if (locked) return locked;
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { name, display_name, role, bio, image_url } = body;

    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = name;
    if (display_name !== undefined) updatePayload.display_name = display_name;
    if (role !== undefined) updatePayload.role = role;
    if (bio !== undefined) updatePayload.bio = bio;
    if (image_url !== undefined) updatePayload.image_url = image_url;

    const { data, error } = await adminClient
      .from('speakers')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Speaker');

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.speakers.update.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const locked = await advancedAuthoringLockedResponse();
  if (locked) return locked;
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from('speakers').delete().eq('id', id).eq('workspace_id', workspaceId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.speakers.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
