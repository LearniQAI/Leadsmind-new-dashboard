'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess, getUserRole } from '@/lib/auth';

import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';
import { logger } from '@/shared/logger';

/**
 * Confirms a stage_id actually belongs to the caller's workspace before it's
 * trusted for a write. Uses the admin client so the lookup itself can't be
 * quietly hidden by RLS one way or the other — the workspace_id comparison
 * below is the real check.
 */
async function assertStageInWorkspace(stageId: string, workspaceId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const { data: stage } = await adminClient
    .from('pipeline_stages')
    .select('id, workspace_id')
    .eq('id', stageId)
    .maybeSingle();

  return !!stage && stage.workspace_id === workspaceId;
}

export async function createPipeline({ name, stages }: { name: string, stages: string[] }) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  // 1. Create Pipeline
  const { data: pipeline, error: pError } = await supabase
    .from('pipelines')
    .insert({ workspace_id: workspaceId, name })
    .select()
    .single();

  if (pError) {
    logger.error({ err: pError, workspaceId }, 'pipelines.pipeline.create.failed');
    return { success: false, error: 'Failed to create pipeline.' };
  }

  // 2. Create Stages
  const stagePayloads = stages.map((s, i) => ({
    workspace_id: workspaceId,
    pipeline_id: pipeline.id,
    name: s,
    position: i
  }));

  const { error: sError } = await supabase
    .from('pipeline_stages')
    .insert(stagePayloads);

  if (sError) {
    logger.error({ err: sError, workspaceId, pipelineId: pipeline.id }, 'pipelines.stages.create.failed');
    return { success: false, error: 'Failed to create pipeline stages.' };
  }

  revalidatePath('/pipelines');
  return { success: true, data: pipeline as Pipeline };
}

/**
 * Deletes an entire pipeline. `pipeline_stages.pipeline_id` cascades
 * ON DELETE CASCADE, and each stage cascades to its
 * `opportunities` the same way (see deleteStage) — so this one delete
 * removes the pipeline, all of its stages, and every deal inside them.
 * Restricted to admin/manager, same tier as deleteTask/deleteStage.
 */
export async function deletePipeline(id: string) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const role = await getUserRole();
  if (role !== 'admin' && role !== 'manager') {
    return { success: false, error: 'Only admins/managers can delete a pipeline' };
  }

  const { error } = await supabase.from('pipelines').delete().eq('id', id).eq('workspace_id', workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId, pipelineId: id }, 'pipelines.pipeline.delete.failed');
    return { success: false, error: 'Failed to delete pipeline.' };
  }

  revalidatePath('/pipelines');
  return { success: true };
}

export async function createOpportunity(values: any) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      workspace_id: workspaceId,
      contact_id: values.contact_id || null,
      stage_id: values.stage_id,
      title: values.title,
      value: values.value || 0,
      status: 'open',
      position: values.position || 0
    })
    .select()
    .single();

  if (error) {
    logger.error({ err: error, workspaceId }, 'pipelines.opportunity.create.failed');
    return { success: false, error: 'Failed to create opportunity.' };
  }

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
    dispatchWebhook(workspaceId, 'deal.created', {
      deal: { id: data.id, title: data.title, value: data.value, currency: data.currency || 'USD', status: data.status, stage_id: data.stage_id, contact_id: data.contact_id },
    }).catch(() => {});
  } catch (e) {
    logger.error({ err: e, workspaceId, opportunityId: data.id }, 'pipelines.opportunity.create_webhook_dispatch.failed');
  }
  
  revalidatePath('/pipelines');
  return { success: true, data: data as Opportunity };
}

export async function getPipelines() {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('pipelines')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error({ err: error, workspaceId }, 'pipelines.pipelines.fetch.failed');
    return { success: false, error: 'Failed to fetch pipelines.' };
  }
  return { success: true, data: data as Pipeline[] };
}

export async function getPipelineStages(pipelineId: string) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true });

  if (error) {
    logger.error({ err: error, pipelineId }, 'pipelines.stages.fetch.failed');
    return { success: false, error: 'Failed to fetch pipeline stages.' };
  }
  return { success: true, data: data as PipelineStage[] };
}

// getPipelineOpportunities previously fetched every deal across every stage
// of a pipeline with no limit — fine at MVP scale, but a stage with
// hundreds of deals meant an unbounded fetch + an unbounded DOM render
// (KanbanColumn's plain .map()) on every single page load. Now loads only
// the first PIPELINE_OPPORTUNITIES_PAGE_SIZE deals per stage (ordered the
// same way the board already orders them, `position ASC`), plus each
// stage's real total count so the client knows whether a "Load more" is
// needed — see getMoreStageOpportunities below for the follow-up pages.
const PIPELINE_OPPORTUNITIES_PAGE_SIZE = 50;
const OPPORTUNITY_SELECT_WITH_CONTACT = '*, contact:contacts!opportunities_contact_id_fkey(*)';

export async function getPipelineOpportunities(pipelineId: string) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipelineId)
    .eq('workspace_id', workspaceId);

  if (!stages || stages.length === 0) return { success: true, data: [], stageCounts: {} };

  const stageIds = stages.map(s => s.id);
  // One paginated query per stage rather than a single `.in('stage_id', ...)`
  // fetch — PostgREST/Supabase-js has no "top N per group" primitive, and
  // stage count is always small (a handful of stages) vs. potentially
  // hundreds of deals per stage, so this stays cheap. Each query also asks
  // for the stage's real total (`count: 'exact'`) in the same round trip.
  //
  // `opportunities` has THREE foreign keys into `contacts` (`contact_id`,
  // plus `buyer_id`/`seller_id` added by the real-estate-pipeline migration,
  // 20240101000210) — an unqualified `contacts(*)` embed is genuinely
  // ambiguous to PostgREST and fails outright (PGRST201, "more than one
  // relationship was found"), not silently or partially. This was the real
  // root cause of the "deal added but invisible" bug: this query has been
  // failing on every single call regardless of whether a deal was just
  // added, so the board's `initialOpportunities` was always `[]` from the
  // very first server render, for every workspace — confirmed live against
  // the actual database, not inferred. Explicitly qualifying the FK
  // constraint name (the one this app's `contact_id` field actually uses,
  // per `Opportunity`'s type and `createOpportunity`'s own insert shape)
  // resolves the ambiguity.
  const perStageResults = await Promise.all(
    stageIds.map(async (stageId) => {
      const { data, error, count } = await supabase
        .from('opportunities')
        .select(OPPORTUNITY_SELECT_WITH_CONTACT, { count: 'exact' })
        .eq('stage_id', stageId)
        .order('position', { ascending: true })
        .range(0, PIPELINE_OPPORTUNITIES_PAGE_SIZE - 1);
      return { stageId, data: data || [], error, total: count ?? 0 };
    })
  );

  const failed = perStageResults.find((r) => r.error);
  if (failed) {
    logger.error({ err: failed.error, workspaceId, pipelineId, stageId: failed.stageId }, 'pipelines.opportunities.fetch.failed');
    return { success: false, error: 'Failed to fetch opportunities.' };
  }

  const opportunities = perStageResults.flatMap((r) => r.data);
  const stageCounts: Record<string, number> = {};
  perStageResults.forEach((r) => { stageCounts[r.stageId] = r.total; });

  return { success: true, data: opportunities as Opportunity[], stageCounts };
}

/** Follow-up pages for one stage's deal list ("Load more" in KanbanColumn). */
export async function getMoreStageOpportunities(stageId: string, offset: number) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  if (!(await assertStageInWorkspace(stageId, workspaceId))) {
    logger.error({ workspaceId, stageId }, 'pipelines.more_stage_opportunities.cross_tenant_stage_rejected');
    return { success: false, error: 'Unauthorized: stage does not belong to this workspace.' };
  }

  const { data, error, count } = await supabase
    .from('opportunities')
    .select(OPPORTUNITY_SELECT_WITH_CONTACT, { count: 'exact' })
    .eq('stage_id', stageId)
    .eq('workspace_id', workspaceId)
    .order('position', { ascending: true })
    .range(offset, offset + PIPELINE_OPPORTUNITIES_PAGE_SIZE - 1);

  if (error) {
    logger.error({ err: error, workspaceId, stageId, offset }, 'pipelines.more_stage_opportunities.fetch.failed');
    return { success: false, error: 'Failed to load more deals.' };
  }

  return { success: true, data: data as Opportunity[], total: count ?? 0 };
}

export async function updateDealStage(
  dealId: string,
  stageId: string,
  position: number,
  expectedUpdatedAt?: string
): Promise<{ success: boolean; error?: string; conflict?: boolean }> {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  if (!(await assertStageInWorkspace(stageId, workspaceId))) {
    logger.error({ workspaceId, dealId, stageId }, 'pipelines.deal_stage.cross_tenant_stage_rejected');
    return { success: false, error: 'Unauthorized: target stage does not belong to this workspace.' };
  }

  const { data: dealBefore } = await supabase
    .from('opportunities')
    .select('workspace_id, contact_id, status, stage_id, updated_at')
    .eq("id", dealId).eq("workspace_id", workspaceId)
    .single();

  if (!dealBefore) {
    return { success: false, error: 'Deal not found.' };
  }

  // Lightweight optimistic-concurrency guard: `expectedUpdatedAt` is the
  // last value this board actually saw for this deal. If it no longer
  // matches what's in the database, someone else (another tab, another
  // user) changed this exact deal since this board's local state was last
  // synced — refuse the write outright instead of silently overwriting
  // their change with this stale one. Only enforced when the caller
  // actually supplies a value, so this stays backward-compatible with any
  // future caller that doesn't track it.
  if (expectedUpdatedAt && dealBefore.updated_at !== expectedUpdatedAt) {
    logger.warn(
      { workspaceId, dealId, expectedUpdatedAt, actualUpdatedAt: dealBefore.updated_at },
      'pipelines.deal_stage.conflict_detected'
    );
    return { success: false, conflict: true, error: 'This deal was just changed by someone else. Refresh and try again.' };
  }

  // `position` here is @hello-pangea/dnd's destination.index — the client's
  // LOCAL rendered index at drag-end, not a value computed from the
  // database's actual current state. Writing it directly (the old
  // behavior) let two deals end up with identical stage_id+position under
  // concurrent/rapid drags — confirmed live. move_opportunity_to_position
  // treats it only as an insertion-index HINT and computes/writes the real
  // position itself, atomically, from a fresh read of the destination
  // stage's current order — see the migration for the full rationale.
  const { error } = await supabase.rpc('move_opportunity_to_position', {
    p_workspace_id: workspaceId,
    p_deal_id: dealId,
    p_target_stage_id: stageId,
    p_target_index: position,
  });

  if (error) {
    logger.error({ err: error, workspaceId, dealId }, 'pipelines.deal_stage.update.failed');
    return { success: false, error: 'Failed to update deal stage.' };
  }

  const previousStageId = dealBefore?.stage_id ?? null;

  // Fire the same generic trigger event + webhook on every stage change,
  // not just moves into a stage literally named "won" — this is the primary
  // way users move deals (board drag-and-drop), and the automation builder
  // advertises "Opportunity stage changed" as firing on any stage change
  // with no such restriction. Confirmed live via audit: an automation built
  // on a non-"won" stage never fired from a real board drag before this
  // fix. Matches the unconditional behavior CRMActionHandler.ts (automation-
  // driven moves) and updateOpportunity below (edit-modal moves) already had.
  if (previousStageId !== stageId) {
    if (dealBefore?.contact_id) {
      try {
        const { publishEvent } = await import('@/lib/events/EventBus');
        await publishEvent(workspaceId, 'opportunity_stage_changed', dealBefore.contact_id, {
          dealId,
          stageId,
          previousStageId,
        });
      } catch (e) {
        logger.error({ err: e, workspaceId, dealId }, 'pipelines.deal_stage.event_publish.failed');
      }
    }

    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      dispatchWebhook(workspaceId, 'deal.stage_changed', {
        deal: { id: dealId, contact_id: dealBefore?.contact_id ?? null },
        previous_stage_id: previousStageId,
        new_stage_id: stageId,
      }).catch(() => {});
    } catch (e) {
      logger.error({ err: e, workspaceId, dealId }, 'pipelines.deal_stage.webhook_dispatch.failed');
    }
  }

  // "won" is a distinct, additional signal (deal.won) layered on top of the
  // generic stage_changed event/webhook above — unchanged from before.
  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', stageId)
    .single();

  if (stage?.name?.toLowerCase() === 'won' && dealBefore?.contact_id) {
    try {
      const { data: deal } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', dealId)
        .single();
      if (deal) {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        dispatchWebhook(workspaceId, 'deal.won', {
          deal: {
            id: deal.id,
            title: deal.title,
            value: deal.value,
            currency: 'USD',
            status: 'won',
            contact: {
              id: deal.contact_id,
            }
          }
        }).catch(() => {});
      }
    } catch (e) {
      logger.error({ err: e, workspaceId, dealId }, 'pipelines.deal_won.webhook_dispatch.failed');
    }
  }

  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateOpportunity(id: string, values: any) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  if (values.stage_id && !(await assertStageInWorkspace(values.stage_id, workspaceId))) {
    logger.error({ workspaceId, opportunityId: id, stageId: values.stage_id }, 'pipelines.opportunity_update.cross_tenant_stage_rejected');
    return { success: false, error: 'Unauthorized: target stage does not belong to this workspace.' };
  }

  const { data: dealBefore } = await supabase
    .from('opportunities')
    .select('stage_id, status')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();
  const prevStageId = dealBefore?.stage_id;
  const prevStatus = dealBefore?.status;
  const isStageChange = !!values.stage_id && values.stage_id !== prevStageId;

  // A real stage change goes through move_opportunity_to_position instead
  // of being written directly here — the same atomic, collision-proof
  // re-sequencing the drag-and-drop path uses (see
  // 20260917030000_opportunity_position_resequence.sql). Before this fix,
  // this edit-modal path kept the deal's OLD position number on a stage
  // change, which could collide with the target stage's existing values —
  // exactly the bug already fixed for drag-and-drop, left untreated here.
  // This form has no drag gesture/index to work from, so it appends to the
  // end of the target stage: INT4_MAX as the target index, which the RPC
  // clamps down to "one past the last real row" regardless of the target
  // stage's actual size — matching how a plain "move to stage X" action is
  // conventionally expected to behave.
  //
  // Run BEFORE the simple-fields update below so a failure here leaves
  // nothing written at all, rather than a partial save (fields changed but
  // stage move failed, or vice versa) — Supabase has no cross-call
  // transaction here, so ordering is the practical way to keep a failure
  // as close to atomic as this can be.
  if (isStageChange) {
    const { error: moveError } = await supabase.rpc('move_opportunity_to_position', {
      p_workspace_id: workspaceId,
      p_deal_id: id,
      p_target_stage_id: values.stage_id,
      p_target_index: 2147483647,
    });
    if (moveError) {
      logger.error({ err: moveError, workspaceId, opportunityId: id, stageId: values.stage_id }, 'pipelines.opportunity_update.move_position.failed');
      return { success: false, error: 'Failed to move deal to the new stage.' };
    }
  }

  const payload: Record<string, any> = {
    contact_id: values.contact_id || null,
    title: values.title,
    value: values.value || 0,
    status: values.status || 'open',
    updated_at: new Date().toISOString()
  };
  // Stage unchanged (or not provided): include it in the ordinary update
  // exactly as before — harmless no-op when it matches the existing value.
  if (!isStageChange) {
    payload.stage_id = values.stage_id;
  }

  const { error: updateError } = await supabase
    .from('opportunities')
    .update(payload)
    .eq("id", id).eq("workspace_id", workspaceId);

  if (updateError) {
    logger.error({ err: updateError, workspaceId, opportunityId: id }, 'pipelines.opportunity.update.failed');
    return { success: false, error: 'Failed to update opportunity.' };
  }

  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id).eq('workspace_id', workspaceId)
    .single();

  if (error || !data) {
    logger.error({ err: error, workspaceId, opportunityId: id }, 'pipelines.opportunity.refetch_after_update.failed');
    return { success: false, error: 'Failed to load the updated deal.' };
  }

  // Check if status is updated to 'won' OR if stage has been updated to 'won'
  if (data) {
    const { data: stage } = await supabase
      .from('pipeline_stages')
      .select('name')
      .eq('id', data.stage_id)
      .single();

    if ((data.status === 'won' || stage?.name?.toLowerCase() === 'won') && data.contact_id) {
      const { publishEvent } = await import('@/lib/events/EventBus');
      await publishEvent(data.workspace_id, 'opportunity_stage_changed', data.contact_id, {
        dealId: id,
        stageId: data.stage_id,
        status: data.status
      });

      try {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        dispatchWebhook(data.workspace_id, 'deal.won', {
          deal: {
            id: data.id,
            title: data.title,
            value: data.value,
            currency: 'USD',
            status: 'won',
            contact: {
              id: data.contact_id,
            }
          }
        }).catch(() => {});
      } catch (e) {
        logger.error({ err: e, workspaceId: data.workspace_id, opportunityId: id }, 'pipelines.deal_won_update.webhook_dispatch.failed');
      }
    }

    try {
      const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
      if (values.stage_id && values.stage_id !== prevStageId) {
        dispatchWebhook(data.workspace_id, 'deal.stage_changed', {
          deal: { id: data.id, title: data.title, value: data.value, status: data.status },
          previous_stage_id: prevStageId, new_stage_id: values.stage_id,
        }).catch(() => {});
      }
      if (values.status === 'lost' && prevStatus !== 'lost') {
        dispatchWebhook(data.workspace_id, 'deal.lost', {
          deal: { id: data.id, title: data.title, value: data.value, status: 'lost' },
        }).catch(() => {});
        if (data.contact_id) {
          const { applyAutoTag } = await import('@/modules/tags/autoTagging/applySystemTag');
          applyAutoTag(data.workspace_id, 'contact', data.contact_id, 'Lost Deal', true).catch(() => {});
        }
      }
    } catch (e) {
      logger.error({ err: e, workspaceId: data.workspace_id, opportunityId: id }, 'pipelines.opportunity_update.webhook_dispatch.failed');
    }
  }

  revalidatePath('/pipelines');
  return { success: true, data: data as Opportunity };
}

export async function deleteOpportunity(id: string) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase.from('opportunities').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId, opportunityId: id }, 'pipelines.opportunity.delete.failed');
    return { success: false, error: 'Failed to delete opportunity.' };
  }
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateStageOrder(pipelineId: string, stages: { id: string, position: number }[]) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase.rpc('update_stage_positions', {
    p_workspace_id: workspaceId,
    p_stage_ids: stages.map(s => s.id),
    p_positions: stages.map(s => s.position),
  });

  if (error) {
    logger.error({ err: error, workspaceId, pipelineId }, 'pipelines.stage_order.rpc_failed');
    return { success: false, error: 'Failed to update stage order.' };
  }

  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateStage(id: string, name: string) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const { error } = await supabase
    .from('pipeline_stages')
    .update({ name })
    .eq("id", id).eq("workspace_id", workspaceId);

  if (error) {
    logger.error({ err: error, workspaceId, stageId: id }, 'pipelines.stage.update.failed');
    return { success: false, error: 'Failed to update stage.' };
  }
  revalidatePath('/pipelines');
  return { success: true };
}

/**
 * Deletes a pipeline stage. `pipeline_stages.id` cascades to `opportunities`
 * (ON DELETE CASCADE), so a stage with active deals is never dropped silently:
 * - With no `fallbackStageId` and no `force`, it refuses and reports how many
 *   deals are in the way so the caller can offer a fallback stage.
 * - With a `fallbackStageId`, those deals are migrated to it first.
 * - With `force: true` and no fallback, the caller has explicitly accepted
 *   that the deals will be permanently deleted along with the stage.
 */
type DeleteStageResult =
  | { success: true }
  | { success: false; error: string; requiresFallback?: boolean; dealCount?: number };

export async function deleteStage(
  id: string,
  options?: { fallbackStageId?: string; force?: boolean }
): Promise<DeleteStageResult> {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  const fallbackStageId = options?.fallbackStageId;
  const force = options?.force ?? false;

  if (fallbackStageId) {
    if (fallbackStageId === id) {
      return { success: false, error: 'Fallback stage cannot be the stage being deleted.' };
    }
    if (!(await assertStageInWorkspace(fallbackStageId, workspaceId))) {
      return { success: false, error: 'Unauthorized: fallback stage does not belong to this workspace.' };
    }
  }

  const { count: dealCount } = await supabase
    .from('opportunities')
    .select('id', { count: 'exact', head: true })
    .eq('stage_id', id)
    .eq('workspace_id', workspaceId);

  if (dealCount && dealCount > 0) {
    if (fallbackStageId) {
      const { error: migrateError } = await supabase
        .from('opportunities')
        .update({ stage_id: fallbackStageId, stage_entered_at: new Date().toISOString() })
        .eq('stage_id', id)
        .eq('workspace_id', workspaceId);

      if (migrateError) {
        logger.error({ err: migrateError, workspaceId, stageId: id, fallbackStageId }, 'pipelines.stage.delete.migrate_deals_failed');
        return { success: false, error: 'Failed to migrate deals to the fallback stage.' };
      }
    } else if (!force) {
      return {
        success: false,
        requiresFallback: true,
        dealCount,
        error: `This stage has ${dealCount} active deal(s). Provide a fallback stage or confirm permanent deletion.`,
      };
    }
    // force === true, no fallback: fall through and let ON DELETE CASCADE remove the deals.
  }

  const { error } = await supabase.from('pipeline_stages').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId, stageId: id }, 'pipelines.stage.delete.failed');
    return { success: false, error: 'Failed to delete stage.' };
  }
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updatePipelineStages(pipelineId: string, stages: { id: string, name: string }[]) {
  const supabase = await createServerClient();
  let workspaceId: string;
  try {
    ({ workspaceId } = await requireWorkspaceAccess());
  } catch {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const isNew = stage.id.startsWith('new-');

      if (isNew) {
        const { error: insError } = await supabase.from('pipeline_stages').insert({
          workspace_id: workspaceId,
          pipeline_id: pipelineId,
          name: stage.name,
          position: i
        });
        if (insError) throw insError;
      } else {
        const { error: updError } = await supabase.from('pipeline_stages').update({
          name: stage.name,
          position: i
        }).eq("id", stage.id).eq("workspace_id", workspaceId);
        if (updError) throw updError;
      }
    }

    revalidatePath('/pipelines');
    return { success: true };
  } catch (err: any) {
    logger.error({ err, workspaceId, pipelineId }, 'pipelines.stages.bulk_update.failed');
    return { success: false, error: 'Failed to update pipeline stages.' };
  }
}

