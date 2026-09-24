import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireLmsInstructor } from '@/lib/lms/access';
import { ForbiddenError, NotFoundError, toClientError } from '@/shared/errors/AppError';
import { logger } from '@/shared/logger';
import { normalizeWaveformColor } from '@/lib/lms/audio/waveformColor';

export const dynamic = 'force-dynamic';

// Sets / clears an audio block's per-lesson waveform colour (content_blocks.audio_waveform_color,
// see 20260926100001_lms_audio_block_waveform_color.sql). Mirrors the artwork route: its own
// endpoint so it writes exactly one column. Stores the admin's pick as-is (normalised #RRGGBB);
// the contrast adjustment happens at render time in waveformColorFor(), never here.

async function getOwnedAudioBlock(adminClient: ReturnType<typeof createAdminClient>, id: string, workspaceId: string) {
  const { data: block, error } = await adminClient
    .from('content_blocks')
    .select('id, type, course_lessons!inner(workspace_id)')
    .eq('id', id)
    .eq('course_lessons.workspace_id', workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!block) throw new NotFoundError('Content block');
  if ((block as any).type !== 'audio') throw new ForbiddenError('A waveform colour can only be set on an audio block');
  return block;
}

async function writeColor(adminClient: ReturnType<typeof createAdminClient>, id: string, color: string | null) {
  const { data, error } = await adminClient
    .from('content_blocks')
    .update({ audio_waveform_color: color, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, audio_waveform_color')
    .single();
  if (error) throw error;
  return data;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    await getOwnedAudioBlock(adminClient, id, workspaceId);

    const body = await req.json().catch(() => ({}));
    const color = normalizeWaveformColor(body?.color);
    if (!color) {
      return NextResponse.json({ error: 'Pick a colour in #RRGGBB format.' }, { status: 400 });
    }

    return NextResponse.json({ data: await writeColor(adminClient, id, color) });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.waveform_color.set_failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { workspaceId } = await requireLmsInstructor();
    const adminClient = createAdminClient();
    await getOwnedAudioBlock(adminClient, id, workspaceId);
    return NextResponse.json({ data: await writeColor(adminClient, id, null) });
  } catch (err: any) {
    logger.error({ err }, 'lms.content-blocks.waveform_color.clear_failed');
    const clientError = toClientError(err);
    return NextResponse.json({ error: clientError.error, code: clientError.code }, { status: clientError.status });
  }
}
