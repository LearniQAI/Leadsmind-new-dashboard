'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';

import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';
import { logger } from '@/shared/logger';

export async function createPipeline({ name, stages }: { name: string, stages: string[] }) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();
  
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
  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createServerClient();

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
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'No active workspace' };

  const supabase = await createServerClient();
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
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true });

  if (error) {
    logger.error({ err: error, pipelineId }, 'pipelines.stages.fetch.failed');
    return { success: false, error: 'Failed to fetch pipeline stages.' };
  }
  return { success: true, data: data as PipelineStage[] };
}

export async function getPipelineOpportunities(pipelineId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createServerClient();
  
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id')
    .eq('pipeline_id', pipelineId);
  
  if (!stages || stages.length === 0) return { success: true, data: [] };

  const stageIds = stages.map(s => s.id);
  const { data: opportunities, error: oppError } = await supabase
    .from('opportunities')
    .select('*, contact:contacts(*)')
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
  const workspaceId = await getCurrentWorkspaceId();
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
  const workspaceId = await getCurrentWorkspaceId();
  
  const { data: dealBefore } = await supabase
    .from('opportunities')
    .select('stage_id, status')
    .eq('id', id)
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
  const workspaceId = await getCurrentWorkspaceId();
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
  const workspaceId = await getCurrentWorkspaceId();
  
  const { error } = await supabase.rpc('update_stage_positions', {
    stage_updates: stages
  });

  if (error) {
    // Fallback if RPC doesn't exist yet
    for (const stage of stages) {
      await supabase
        .from('pipeline_stages')
        .update({ position: stage.position })
        .eq("id", stage.id).eq("workspace_id", workspaceId);
    }
  }

  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateStage(id: string, name: string) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
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

export async function deleteStage(id: string) {
  const supabase = await createServerClient();
  const workspaceId = await getCurrentWorkspaceId();
  const { error } = await supabase.from('pipeline_stages').delete().eq("id", id).eq("workspace_id", workspaceId);
  if (error) {
    logger.error({ err: error, workspaceId, stageId: id }, 'pipelines.stage.delete.failed');
    return { success: false, error: 'Failed to delete stage.' };
  }
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updatePipelineStages(pipelineId: string, stages: { id: string, name: string }[]) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };
  const supabase = await createServerClient();

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

