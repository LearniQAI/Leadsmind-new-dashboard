'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { SegmentationCompiler, RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { validateRuleGroup } from '@/lib/segments/ruleValidation';
import { findSegmentDependents } from '@/lib/segments/dependents';

export async function listSegments() {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: segments, error } = await supabase
      .from('segments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw error;

    // Live member count — computed via the same executeSegment() campaigns use
    // at send time, not a stale cached number.
    const withCounts = await Promise.all(
      (segments ?? []).map(async (segment) => {
        try {
          const matches = await SegmentationCompiler.executeSegment(workspaceId, segment.rule_group as RuleGroup);
          return { ...segment, memberCount: matches.length };
        } catch (err: any) {
          logger.error({ err, segmentId: segment.id }, 'segment.count.failed');
          return { ...segment, memberCount: null };
        }
      })
    );

    return { success: true, data: withCounts };
  } catch (error: any) {
    logger.error({ err: error }, 'list.segments.failed');
    return { success: false, error: 'Operation failed. Please try again.' };
  }
}

export async function createSegment(payload: { name: string; ruleGroup: RuleGroup }) {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    if (!payload.name?.trim()) return { success: false, error: 'Segment name is required' };
    // Server-side, so an API caller cannot store an unknown field or a blank value that would
    // later match the wrong audience (the UI enforces the same rules for a clear message).
    const ruleProblem = validateRuleGroup(payload.ruleGroup);
    if (ruleProblem) return { success: false, error: ruleProblem };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('segments')
      .insert({
        workspace_id: workspaceId,
        name: payload.name.trim(),
        rule_group: payload.ruleGroup,
        created_by: userId,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { success: false, error: 'A segment with this name already exists' };
      throw error;
    }

    revalidatePath('/segments');
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error }, 'create.segment.failed');
    return { success: false, error: error.message || 'Operation failed. Please try again.' };
  }
}

export async function updateSegment(id: string, payload: Partial<{ name: string; ruleGroup: RuleGroup }>) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    if (payload.name !== undefined && !payload.name.trim()) return { success: false, error: 'Segment name is required' };
    if (payload.ruleGroup) {
      const ruleProblem = validateRuleGroup(payload.ruleGroup);
      if (ruleProblem) return { success: false, error: ruleProblem };
    }

    const updates: Record<string, any> = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.ruleGroup !== undefined) updates.rule_group = payload.ruleGroup;

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('segments')
      .update(updates)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { success: false, error: 'A segment with this name already exists' };
      throw error;
    }

    revalidatePath('/segments');
    return { success: true, data };
  } catch (error: any) {
    logger.error({ err: error }, 'update.segment.failed');
    return { success: false, error: error.message || 'Operation failed. Please try again.' };
  }
}

export async function getSegmentDependents(id: string) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();
    return { success: true, data: await findSegmentDependents(supabase, workspaceId, id) };
  } catch (error: any) {
    logger.error({ err: error }, 'segment.dependents.failed');
    return { success: false, error: 'Could not check what uses this segment. Please try again.' };
  }
}

/**
 * Deletes a segment. If campaigns / auto-senders / broadcasts still reference it, the delete is
 * NOT silently blocked and NOT silently done: the caller gets `requiresConfirmation` with the
 * dependents, and must call again with `acknowledgeDependents: true`. Enforced here (not only in
 * the UI) so any caller sees the consequence.
 */
export async function deleteSegment(id: string, opts: { acknowledgeDependents?: boolean } = {}) {
  try {
    const { workspaceId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    if (!opts.acknowledgeDependents) {
      const dependents = await findSegmentDependents(supabase, workspaceId, id);
      if (dependents.length > 0) {
        return { success: false, requiresConfirmation: true as const, dependents, error: 'This segment is still in use.' };
      }
    }

    const { error } = await supabase
      .from('segments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw error;

    revalidatePath('/segments');
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.segment.failed');
    return { success: false, error: 'Operation failed. Please try again.' };
  }
}
