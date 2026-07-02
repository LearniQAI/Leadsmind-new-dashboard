'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';

import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';

console.log('>>> [CRITICAL DEBUG] Pipelines Actions File Loaded');

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

  if (pError) return { success: false, error: pError.message };

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

  if (sError) return { success: false, error: sError.message };

  revalidatePath('/pipelines');
  return { success: true, data: pipeline as Pipeline };
}

export async function createOpportunity(values: any) {
  const workspaceId = await getCurrentWorkspaceId();
  const supabase = await createServerClient();

  console.log(`[SERVER DEBUG] Creating strategic deal:`, values);

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
    console.error(`[SERVER DEBUG] Create deal error:`, error);
    return { success: false, error: error.message };
  }

  try {
    const { dispatchWebhook } = await import('@/lib/webhooks/dispatcher');
    dispatchWebhook(workspaceId, 'deal.created', {
      deal: { id: data.id, title: data.title, value: data.value, currency: data.currency || 'USD', status: data.status, stage_id: data.stage_id, contact_id: data.contact_id },
    }).catch(() => {});
  } catch (e) { console.error('[webhook-dispatch-deal-created-error]', e); }
  
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

  if (error) return { success: false, error: error.message };
  return { success: true, data: data as Pipeline[] };
}

export async function getPipelineStages(pipelineId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true });

  if (error) return { success: false, error: error.message };
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

  if (oppError) return { success: false, error: oppError.message };
  return { success: true, data: opportunities as Opportunity[] };
}

export async function updateDealStage(dealId: string, stageId: string, position: number) {
  const supabase = await createServerClient();
  const { data: dealBefore } = await supabase
    .from('opportunities')
    .select('workspace_id, contact_id, status')
    .eq("id", dealId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
    .single();

  const { error } = await supabase
    .from('opportunities')
    .update({ 
      stage_id: stageId, 
      position, 
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", dealId).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

  if (error) return { success: false, error: error.message };

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
      console.error('[webhook-dispatch-deal-won-error]', e);
    }
  }
  
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateOpportunity(id: string, values: any) {
  console.log(`>>> [CRITICAL DEBUG] updateOpportunity CALLED for ID: ${id}`);
  console.log(`>>> [CRITICAL DEBUG] Values:`, JSON.stringify(values, null, 2));
  
  const supabase = await createServerClient();
  
  const { data: dealBefore } = await supabase
    .from('opportunities')
    .select('stage_id, status')
    .eq('id', id)
    .single();
  const prevStageId = dealBefore?.stage_id;
  const prevStatus = dealBefore?.status;
  
  // Explicitly log the payload we are about to send to Supabase
  const payload = {
    contact_id: values.contact_id || null,
    stage_id: values.stage_id,
    title: values.title,
    value: values.value || 0,
    status: values.status || 'open',
    updated_at: new Date().toISOString()
  };
  
  console.log(`>>> [CRITICAL DEBUG] Supabase Payload:`, JSON.stringify(payload, null, 2));

  const { data, error } = await supabase
    .from('opportunities')
    .update(payload)
    .eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId)
    .select()
    .single();

  if (error) {
    console.error(`>>> [CRITICAL DEBUG] Supabase Error:`, error);
    return { success: false, error: error.message };
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
        console.error('[webhook-dispatch-deal-won-update-error]', e);
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
    } catch (e) { console.error('[webhook-dispatch-deal-update-error]', e); }
  }
  
  console.log(`>>> [CRITICAL DEBUG] Supabase Success! Returned data:`, JSON.stringify(data, null, 2));
  
  revalidatePath('/pipelines');
  return { success: true, data: data as Opportunity };
}

export async function deleteOpportunity(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('opportunities').delete().eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateStageOrder(pipelineId: string, stages: { id: string, position: number }[]) {
  const supabase = await createServerClient();
  
  const { error } = await supabase.rpc('update_stage_positions', {
    stage_updates: stages
  });

  if (error) {
    // Fallback if RPC doesn't exist yet
    for (const stage of stages) {
      await supabase
        .from('pipeline_stages')
        .update({ position: stage.position })
        .eq("id", stage.id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
    }
  }

  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateStage(id: string, name: string) {
  const supabase = await createServerClient();
  console.log(`[SERVER DEBUG] Updating stage ${id} name to "${name}"`);
  const { error } = await supabase
    .from('pipeline_stages')
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);

  if (error) {
    console.error(`[SERVER DEBUG] Update error:`, error);
    return { success: false, error: error.message };
  }
  revalidatePath('/pipelines');
  return { success: true };
}

export async function deleteStage(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('pipeline_stages').delete().eq("id", id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
  if (error) return { success: false, error: error.message };
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updatePipelineStages(pipelineId: string, stages: { id: string, name: string }[]) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false, error: 'Unauthorized' };
  const supabase = await createServerClient();

  console.log(`[SERVER DEBUG] Bulk updating stages for pipeline ${pipelineId}:`, stages);
  try {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const isNew = stage.id.startsWith('new-');

      if (isNew) {
        console.log(`[SERVER DEBUG] Inserting new stage: ${stage.name}`);
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
        }).eq("id", stage.id).eq("workspace_id", workspaceId).eq('workspace_id', workspaceId);
        if (updError) throw updError;
      }
    }

    revalidatePath('/pipelines');
    return { success: true };
  } catch (err: any) {
    console.error(`[SERVER DEBUG] Bulk update error:`, err);
    return { success: false, error: err.message };
  }
}

