'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requireWorkspaceAccess } from '@/lib/auth';

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
  
  if (!stages || stages.length === 0) return { success: true, data: [] };

  const stageIds = stages.map(s => s.id);
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
  const { data: opportunities, error: oppError } = await supabase
    .from('opportunities')
    .select('*, contact:contacts!opportunities_contact_id_fkey(*)')
    .in('stage_id', stageIds)
    .order('position', { ascending: true });

  if (oppError) {
    logger.error({ err: oppError, workspaceId, pipelineId }, 'pipelines.opportunities.fetch.failed');
    return { success: false, error: 'Failed to fetch opportunities.' };
  }
  return { success: true, data: opportunities as Opportunity[] };
}

export async function updateDealStage(dealId: string, stageId: string, position: number) {
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
    .select('workspace_id, contact_id, status')
    .eq("id", dealId).eq("workspace_id", workspaceId)
    .single();

  const { error } = await supabase
    .from('opportunities')
    .update({ 
      stage_id: stageId, 
      position, 
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", dealId).eq("workspace_id", workspaceId);

  if (error) {
    logger.error({ err: error, workspaceId, dealId }, 'pipelines.deal_stage.update.failed');
    return { success: false, error: 'Failed to update deal stage.' };
  }

  const { data: stage } = await supabase
    .from('pipeline_stages')
    .select('name')
    .eq('id', stageId)
    .single();

  if (stage?.name?.toLowerCase() === 'won' && dealBefore?.contact_id) {
    const { publishEvent } = await import('@/lib/events/EventBus');
    await publishEvent(dealBefore.workspace_id, 'opportunity_stage_changed', dealBefore.contact_id, {
      dealId,
      stageId,
      status: 'won'
    });

    try {
      const { data: deal } = await supabase
        .from('opportunities')
        .select('*')
        .eq('id', dealId)
        .single();
      if (deal) {
        const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
        dispatchWebhook(dealBefore.workspace_id, 'deal.won', {
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
      logger.error({ err: e, workspaceId: dealBefore.workspace_id, dealId }, 'pipelines.deal_won.webhook_dispatch.failed');
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
  
  const payload = {
    contact_id: values.contact_id || null,
    stage_id: values.stage_id,
    title: values.title,
    value: values.value || 0,
    status: values.status || 'open',
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('opportunities')
    .update(payload)
    .eq("id", id).eq("workspace_id", workspaceId)
    .select()
    .single();

  if (error) {
    logger.error({ err: error, workspaceId, opportunityId: id }, 'pipelines.opportunity.update.failed');
    return { success: false, error: 'Failed to update opportunity.' };
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
    .update({ name, updated_at: new Date().toISOString() })
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
          position: i,
          updated_at: new Date().toISOString()
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

