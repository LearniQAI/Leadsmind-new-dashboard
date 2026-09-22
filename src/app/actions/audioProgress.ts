'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { getUser, getCurrentWorkspaceId } from '@/lib/auth';
import { getOrCreateStudentContact } from './studentEnrollments';
import { recordBlockCompletion } from './blockCompletion';
import { logger } from '@/shared/logger';

// Drive-mode audio's resume/analytics table. This is NOT a second source of truth for
// completion — recordBlockCompletion() -> lesson_block_completions stays the one real
// completion signal (same as it already is for upload/embed-mode audio and video), so
// courseCompletion.ts never has to know this feature exists. This action just also upserts the
// resume position + a denormalized `completed` flag for the admin analytics view, and mirrors
// the same 90%-threshold call into recordBlockCompletion the existing VoiceNotePlayer already
// makes for upload-mode audio.
export async function recordAudioProgress(
  contentBlockId: string,
  input: { positionSeconds: number; durationSeconds?: number; percentage: number }
) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Not authenticated' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No active workspace context' };

    const contactId = await getOrCreateStudentContact(workspaceId);
    if (!contactId) return { error: 'Failed to resolve student contact' };

    const adminClient = createAdminClient();

    const { data: block, error: blockErr } = await adminClient
      .from('content_blocks')
      .select('id, completion_threshold, content, course_lessons!inner(workspace_id)')
      .eq('id', contentBlockId)
      .eq('course_lessons.workspace_id', workspaceId)
      .maybeSingle();
    if (blockErr) throw blockErr;
    if (!block) return { error: 'Content block not found' };

    const threshold = (block as any).completion_threshold ?? 90;
    const percentage = Math.max(0, Math.min(100, input.percentage));
    const completed = percentage >= threshold;

    const { error: upsertErr } = await adminClient.from('audio_progress').upsert(
      {
        content_block_id: contentBlockId,
        contact_id: contactId,
        position_seconds: input.positionSeconds,
        completion_percentage: percentage,
        completed,
        last_played_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'content_block_id,contact_id' }
    );
    if (upsertErr) throw upsertErr;

    // Drive v3 exposes no audio-duration field — capture the real duration the browser's own
    // <audio> element reports on its first real load, same disclosed pattern as
    // decodeWaveformPeaks for upload-mode audio.
    const assetId = (block as any).content?.audio_asset_id;
    if (assetId && input.durationSeconds && input.durationSeconds > 0) {
      const { data: asset } = await adminClient
        .from('audio_assets')
        .select('id, duration_seconds')
        .eq('id', assetId)
        .maybeSingle();
      if (asset && asset.duration_seconds == null) {
        await adminClient
          .from('audio_assets')
          .update({ duration_seconds: input.durationSeconds, updated_at: new Date().toISOString() })
          .eq('id', assetId);
      }
    }

    if (completed) {
      await recordBlockCompletion(contentBlockId, { percentage });
    }

    return { success: true, completed };
  } catch (err: any) {
    logger.error({ err, contentBlockId }, 'audio_progress.record.failed');
    return { error: 'Failed to record audio progress.' };
  }
}
