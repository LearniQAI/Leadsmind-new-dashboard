import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const body = await req.json();
    const { title, description, artwork_url, owner_name, owner_email, category, explicit, language } = body;
    const updatePayload: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (artwork_url !== undefined) updatePayload.artwork_url = artwork_url;
    if (owner_name !== undefined) updatePayload.owner_name = owner_name;
    if (owner_email !== undefined) updatePayload.owner_email = owner_email;
    if (category !== undefined) updatePayload.category = category;
    if (explicit !== undefined) updatePayload.explicit = explicit;
    if (language !== undefined) updatePayload.language = language;

    const { data, error } = await adminClient
      .from('podcast_shows')
      .update(updatePayload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Podcast show');

    return NextResponse.json({ data });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_shows.update.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();

    const { error } = await adminClient.from('podcast_shows').delete().eq('id', id).eq('workspace_id', workspaceId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'lms.podcast_shows.delete.failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
