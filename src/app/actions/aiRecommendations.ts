'use server';

import { createServerClient } from '@/lib/supabase/server';
import { requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { logger } from '@/shared/logger';

export async function listAiRecommendations() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('ai_recommendations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    logger.error({ err: error, workspaceId }, 'ai_recommendations.list.failed');
    return { success: false, error: 'Failed to load AI suggestions' };
  }
  return { success: true, data: data ?? [] };
}

// Accepting a suggestion creates the real tag (if it doesn't exist yet) and a real
// tag_assignment — from this point on it's an ordinary tag, indistinguishable from
// a manually-applied one except for tag_type='ai_smart'. Note: `tags.confidence_score`
// is a column on the tag DEFINITION (Part 1 schema), not per-assignment — accepting
// this recommendation updates that shared value to the latest accepted confidence,
// which is an approximation if the same tag is later accepted for a different
// contact at a different confidence. Flagging this as a known schema limitation
// rather than silently treating it as exact.
export async function acceptAiRecommendation(id: string) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: rec, error: fetchErr } = await supabase
    .from('ai_recommendations')
    .select('*')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  if (fetchErr || !rec) return { success: false, error: 'Recommendation not found' };

  let tagId = rec.suggested_tag_id;
  if (!tagId && rec.suggested_tag_name) {
    const { data: existingTag } = await supabase
      .from('tags')
      .select('id')
      .eq('workspace_id', workspaceId)
      .ilike('name', rec.suggested_tag_name)
      .maybeSingle();

    if (existingTag) {
      tagId = existingTag.id;
      await supabase.from('tags').update({ confidence_score: rec.confidence_score }).eq('id', tagId);
    } else {
      const { data: createdTag, error: createErr } = await supabase
        .from('tags')
        .insert({
          workspace_id: workspaceId,
          name: rec.suggested_tag_name,
          tag_type: 'ai_smart',
          visibility: 'team',
          confidence_score: rec.confidence_score,
        })
        .select('id')
        .single();
      if (createErr) return { success: false, error: 'Failed to create suggested tag' };
      tagId = createdTag.id;
    }
  }
  if (!tagId) return { success: false, error: 'No tag to assign' };

  const { error: assignErr } = await supabase
    .from('tag_assignments')
    .insert({ workspace_id: workspaceId, tag_id: tagId, entity_type: rec.entity_type, entity_id: rec.entity_id, assigned_by: null });
  if (assignErr && assignErr.code !== '23505') {
    return { success: false, error: 'Failed to assign tag' };
  }

  await supabase
    .from('ai_recommendations')
    .update({ status: 'accepted', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', id);

  revalidatePath('/contacts/tags');
  return { success: true };
}

export async function rejectAiRecommendation(id: string) {
  const { workspaceId, userId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('ai_recommendations')
    .update({ status: 'rejected', reviewed_by: userId, reviewed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('workspace_id', workspaceId);
  if (error) return { success: false, error: 'Failed to reject recommendation' };

  revalidatePath('/contacts/tags');
  return { success: true };
}
