'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getCurrentWorkspaceId } from '@/lib/auth';

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
  return { success: true, data };
}

export async function getPipelineStages(pipelineId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('pipeline_id', pipelineId)
    .order('position', { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function getPipelineOpportunities(pipelineId: string) {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('opportunities')
    .select('*, contact:contacts(*)')
    .eq('workspace_id', await getCurrentWorkspaceId())
    .eq('stage_id', (await supabase.from('pipeline_stages').select('id').eq('pipeline_id', pipelineId)).data?.map(s => s.id) || [])
    .order('position', { ascending: true });

  // Actually, the above query is a bit complex for Supabase filter if I want to filter by multiple stages.
  // Let's get the stage IDs first.
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
  return { success: true, data: opportunities };
}

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

  revalidatePath('/apps/pipelines');
  return { success: true, data: pipeline };
}

export async function updateDealStage(dealId: string, stageId: string, position: number) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('opportunities')
    .update({ stage_id: stageId, position, stage_entered_at: new Date().toISOString() })
    .eq('id', dealId);

  if (error) return { success: false, error: error.message };
  
  revalidatePath('/apps/pipelines');
  return { success: true };
}

export async function updatePipelineStages(pipelineId: string, stages: any[]) {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { success: false, error: 'No active workspace' };
    const supabase = await createServerClient();

    // This is a bit simplified - in a real app you'd handle deletions, additions, and reorders.
    // For now, let's just update existing ones or insert new ones if they don't have IDs.
    
    for (const [index, stage] of stages.entries()) {
        if (stage.id && !stage.id.startsWith('new-')) {
            await supabase
                .from('pipeline_stages')
                .update({ name: stage.name, position: index })
                .eq('id', stage.id);
        } else {
            await supabase
                .from('pipeline_stages')
                .insert({
                    workspace_id: workspaceId,
                    pipeline_id: pipelineId,
                    name: stage.name,
                    position: index
                });
        }
    }

    revalidatePath(`/apps/pipelines/${pipelineId}/stages`);
    revalidatePath('/apps/pipelines');
    return { success: true };
}

export async function deletePipelineStage(stageId: string) {
    const supabase = await createServerClient();
    const { error } = await supabase
        .from('pipeline_stages')
        .delete()
        .eq('id', stageId);

    if (error) return { success: false, error: error.message };
    return { success: true };
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
    
    revalidatePath('/apps/pipelines');
    return { success: true, data };
}

export async function updateOpportunity(id: string, values: any) {
    const supabase = await createServerClient();

    const { data, error } = await supabase
        .from('opportunities')
        .update({
            contact_id: values.contact_id || null,
            title: values.title,
            value: values.value || 0,
            status: values.status || 'open'
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return { success: false, error: error.message };
    
    revalidatePath('/apps/pipelines');
    return { success: true, data };
}
