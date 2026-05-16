'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';

import { Pipeline, PipelineStage, Opportunity } from '@/types/crm';

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

  if (error) return { success: false, error: error.message };
  
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
  const { error } = await supabase
    .from('opportunities')
    .update({ 
      stage_id: stageId, 
      position, 
      stage_entered_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', dealId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateOpportunity(id: string, values: any) {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('opportunities')
    .update({
      contact_id: values.contact_id || null,
      title: values.title,
      value: values.value || 0,
      status: values.status || 'open',
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/pipelines');
  return { success: true, data: data as Opportunity };
}

export async function deleteOpportunity(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('opportunities').delete().eq('id', id);
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
        .eq('id', stage.id);
    }
  }

  revalidatePath('/pipelines');
  return { success: true };
}

export async function updateStage(id: string, name: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('pipeline_stages')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  revalidatePath('/pipelines');
  return { success: true };
}

export async function deleteStage(id: string) {
  const supabase = await createServerClient();
  const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
  if (error) return { success: false, error: error.message };
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
        await supabase.from('pipeline_stages').insert({
          workspace_id: workspaceId,
          pipeline_id: pipelineId,
          name: stage.name,
          position: i
        });
      } else {
        await supabase.from('pipeline_stages').update({
          name: stage.name,
          position: i,
          updated_at: new Date().toISOString()
        }).eq('id', stage.id);
      }
    }

    revalidatePath('/pipelines');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

