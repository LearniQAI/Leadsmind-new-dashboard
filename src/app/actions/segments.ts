'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';
import { logger } from '@/shared/logger';
import { userSafeMessage } from '@/shared/errors/userSafe';
import { SegmentationCompiler, RuleGroup } from '@/lib/intelligence/SegmentationCompiler';
import { validateRuleGroup } from '@/lib/segments/ruleValidation';
import { findSegmentDependents } from '@/lib/segments/dependents';
import { computeReach, type Reach } from '@/lib/segments/reach';
import { loadSuppressedEmails } from '@/lib/campaigns/emailSuppression';

const GENERIC_ERROR = 'Operation failed. Please try again.';

// memberCount = everyone the rules match. reach = how many of those a campaign can actually
// contact per channel (unsubscribed / invalid / no phone / opted-out are skipped at send time),
// so the UI never presents the raw match count as the reachable audience.
async function segmentCounts(
  workspaceId: string,
  segment: { id: string; rule_group: unknown },
  getSuppressed: () => Promise<Set<string> | null>,
): Promise<{ memberCount: number | null; reach: Reach | null }> {
  try {
    // Count-only path: one aggregate query in the database, no contact rows transferred.
    const counted = await SegmentationCompiler.countSegment(workspaceId, segment.rule_group as RuleGroup);
    if (counted) {
      return { memberCount: counted.total, reach: { email: counted.emailReach, sms: counted.smsReach, whatsapp: counted.smsReach } };
    }
    // Fallback (count RPC unavailable): full evaluation, as before.
    const matches = await SegmentationCompiler.executeSegment(workspaceId, segment.rule_group as RuleGroup);
    return {
      memberCount: matches.length,
      reach: await getSuppressed().then((sup) => (sup ? computeReach(matches, workspaceId, sup) : null)),
    };
  } catch (err: any) {
    logger.error({ err, segmentId: segment.id }, 'segment.count.failed');
    return { memberCount: null, reach: null };
  }
}

// null when the suppression list can't be read: reach is then omitted rather than guessed.
async function loadSuppressionOrNull(workspaceId: string): Promise<Set<string> | null> {
  try {
    return await loadSuppressedEmails(createAdminClient(), [workspaceId]);
  } catch (err: any) {
    logger.error({ err, workspaceId }, 'segment.reach.suppression_lookup_failed');
    return null;
  }
}

function lazySuppression(workspaceId: string): () => Promise<Set<string> | null> {
  let p: Promise<Set<string> | null> | null = null;
  return () => (p ??= loadSuppressionOrNull(workspaceId));
}

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

    // Only the (rare) fallback path needs the suppression list, so load it lazily and once.
    const getSuppressed = lazySuppression(workspaceId);
    // Live counts via the count-only path — no contact rows are fetched just to display a number.
    const withCounts = await Promise.all(
      (segments ?? []).map(async (segment) => ({ ...segment, ...(await segmentCounts(workspaceId, segment, getSuppressed)) }))
    );

    return { success: true, data: withCounts };
  } catch (error: any) {
    logger.error({ err: error }, 'list.segments.failed');
    return { success: false, error: GENERIC_ERROR };
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
    // Counts are returned with the row so the UI can show them immediately (no reload).
    const counts = await segmentCounts(workspaceId, data, lazySuppression(workspaceId));
    return { success: true, data: { ...data, ...counts } };
  } catch (error: any) {
    logger.error({ err: error }, 'create.segment.failed');
    return { success: false, error: userSafeMessage(error, GENERIC_ERROR) };
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
    const counts = await segmentCounts(workspaceId, data, lazySuppression(workspaceId));
    return { success: true, data: { ...data, ...counts } };
  } catch (error: any) {
    logger.error({ err: error }, 'update.segment.failed');
    return { success: false, error: userSafeMessage(error, GENERIC_ERROR) };
  }
}

/**
 * Independent copy of a segment (own row, own rule_group), named "<name> (Copy)" like the other
 * duplicate actions in the app (duplicateWebsite); a numeric suffix keeps the name unique.
 */
export async function duplicateSegment(id: string) {
  try {
    const { workspaceId, userId } = await requireWorkspaceAccess();
    const supabase = await createServerClient();

    const { data: original, error: fetchErr } = await supabase
      .from('segments')
      .select('name, rule_group')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .single();
    if (fetchErr || !original) return { success: false, error: 'Segment not found' };

    const { data: existing, error: namesErr } = await supabase
      .from('segments')
      .select('name')
      .eq('workspace_id', workspaceId);
    if (namesErr) throw namesErr;
    const taken = new Set((existing ?? []).map((s: any) => String(s.name).toLowerCase()));
    let name = `${original.name} (Copy)`;
    for (let n = 2; taken.has(name.toLowerCase()); n++) name = `${original.name} (Copy ${n})`;

    const { data, error } = await supabase
      .from('segments')
      .insert({
        workspace_id: workspaceId,
        name,
        // structuredClone: the copy must never share mutable state with the original.
        rule_group: structuredClone(original.rule_group),
        created_by: userId,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') return { success: false, error: 'A segment with this name already exists' };
      throw error;
    }

    revalidatePath('/segments');
    const counts = await segmentCounts(workspaceId, data, lazySuppression(workspaceId));
    return { success: true, data: { ...data, ...counts } };
  } catch (error: any) {
    logger.error({ err: error }, 'duplicate.segment.failed');
    return { success: false, error: userSafeMessage(error, GENERIC_ERROR) };
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

    // .select('id') returns the rows actually removed. RLS lets only the creator or an
    // admin/owner delete a segment, and a blocked DELETE is NOT an error in PostgREST — it just
    // removes 0 rows — so success must be judged by the affected-row count, not the absence of an error.
    const { data: removed, error } = await supabase
      .from('segments')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select('id');
    if (error) throw error;
    if (!removed || removed.length === 0) {
      return { success: false, error: "This segment wasn't deleted: it no longer exists, or only its creator or a workspace admin can delete it." };
    }

    revalidatePath('/segments');
    return { success: true };
  } catch (error: any) {
    logger.error({ err: error }, 'delete.segment.failed');
    return { success: false, error: 'Operation failed. Please try again.' };
  }
}
