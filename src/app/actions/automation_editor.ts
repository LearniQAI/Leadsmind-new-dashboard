'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ---------- Reference data for the editor's entity pickers ----------
export async function getEditorReferenceData() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false as const, error: 'No active workspace' };
  const supabase = await createServerClient();

  const [tagsRes, pipelinesRes, membersRes, coursesRes, bundlesRes] = await Promise.all([
    supabase.from('tags').select('id, name').eq('workspace_id', workspaceId).order('name'),
    supabase.from('pipelines').select('id, name, pipeline_stages(id, name, position)').eq('workspace_id', workspaceId),
    supabase.from('workspace_members').select('user_id').eq('workspace_id', workspaceId),
    supabase.from('courses').select('id, title').eq('workspace_id', workspaceId).order('title'),
    supabase.from('lms_bundles').select('id, name').eq('workspace_id', workspaceId).order('name'),
  ]);

  // workspace_members.user_id has no schema-registered FK to public.users
  // (only to auth.users) — same fix already applied elsewhere (workspace.ts,
  // settings.ts): resolve names via a separate lookup instead of a PostgREST embed.
  const userIds = (membersRes.data || []).map((m: any) => m.user_id);
  const { data: users } = userIds.length
    ? await supabase.from('users').select('id, first_name, last_name').in('id', userIds)
    : { data: [] as any[] };
  const members = (users || []).map((u: any) => ({ id: u.id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.id }));

  const pipelineStages = (pipelinesRes.data || []).flatMap((p: any) =>
    (p.pipeline_stages || [])
      .sort((a: any, b: any) => a.position - b.position)
      .map((s: any) => ({ id: s.id, name: s.name, pipelineName: p.name }))
  );

  return {
    success: true as const,
    data: {
      tags: tagsRes.data || [],
      pipelineStages,
      members,
      courses: (coursesRes.data || []).map((c: any) => ({ id: c.id, title: c.title })),
      bundles: bundlesRes.data || [],
    },
  };
}

// ---------- Load a workflow for editing ----------
export async function getWorkflowForEdit(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false as const, error: 'No active workspace' };
  const supabase = await createServerClient();

  const { data: workflow, error } = await supabase
    .from('workflows')
    .select('*, workflow_steps(*), workflow_edges(*)')
    .eq('id', id)
    .eq('workspace_id', workspaceId)
    .single();

  if (error || !workflow) return { success: false as const, error: 'Workflow not found' };

  workflow.workflow_steps = (workflow.workflow_steps || []).sort((a: any, b: any) => a.position - b.position);
  return { success: true as const, data: workflow };
}

// ---------- Create a blank draft workflow, then redirect into the editor ----------
export async function createDraftWorkflow() {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from('workflows')
    .insert({ workspace_id: workspaceId, name: 'Untitled workflow', trigger_type: 'contact_created', trigger_config: {}, is_active: false })
    .select('id')
    .single();

  if (error || !data) throw new Error('Failed to create workflow');
  redirect(`/automations/${data.id}/edit`);
}

export interface EditorStepInput {
  position: number;
  type: string;
  config: Record<string, unknown>;
  // Only present for route/split steps: branch/variant -> target step position
  // (resolved to real step ids server-side once all steps are inserted).
  edges?: { sourceHandle: string; targetPosition: number | null }[];
}

export interface SaveWorkflowPayload {
  id: string;
  name: string;
  description: string;
  trigger_type: string;
  is_active: boolean;
  steps: EditorStepInput[];
}

// ---------- Save (full replace of steps/edges, matching the editor's "whole workflow" save model) ----------
export async function saveWorkflowEditor(payload: SaveWorkflowPayload) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: owned } = await supabase.from('workflows').select('id').eq('id', payload.id).eq('workspace_id', workspaceId).maybeSingle();
  if (!owned) return { success: false as const, error: 'Workflow not found' };

  const { error: wfError } = await supabase
    .from('workflows')
    .update({
      name: payload.name,
      description: payload.description,
      trigger_type: payload.trigger_type,
      is_active: payload.is_active,
    })
    .eq('id', payload.id)
    .eq('workspace_id', workspaceId);
  if (wfError) return { success: false as const, error: 'Failed to save workflow' };

  // Full replace: delete existing steps (cascades workflow_edges via
  // source_step_id/target_step_id FKs) and edges, then reinsert in order.
  // Both deletes are error-checked -- confirmed live that an unchecked
  // failure here (e.g. the workflow_executions.current_step_id FK, fixed in
  // 20260731000000_fix_workflow_executions_current_step_id_on_delete.sql)
  // silently leaves old step/edge rows in place alongside the new ones,
  // corrupting position-based ordering everywhere downstream.
  const { error: deleteEdgesError } = await supabase.from('workflow_edges').delete().eq('workflow_id', payload.id);
  if (deleteEdgesError) return { success: false as const, error: 'Failed to clear previous workflow routing' };
  const { error: deleteStepsError } = await supabase.from('workflow_steps').delete().eq('workflow_id', payload.id);
  if (deleteStepsError) return { success: false as const, error: 'Failed to clear previous workflow steps' };

  const insertedSteps: { position: number; id: string }[] = [];
  for (const step of payload.steps.sort((a, b) => a.position - b.position)) {
    const { data: inserted, error: stepError } = await supabase
      .from('workflow_steps')
      .insert({ workflow_id: payload.id, workspace_id: workspaceId, position: step.position, type: step.type, config: step.config })
      .select('id')
      .single();
    if (stepError || !inserted) return { success: false as const, error: `Failed to save step at position ${step.position}` };
    insertedSteps.push({ position: step.position, id: inserted.id });
  }

  // Standard steps auto-chain via position (executor.ts's default fallback
  // edge lookup); only route/split steps need explicit workflow_edges rows.
  for (const step of payload.steps) {
    if (!step.edges || step.edges.length === 0) continue;
    const sourceStepId = insertedSteps.find((s) => s.position === step.position)?.id;
    if (!sourceStepId) continue;

    for (const edge of step.edges) {
      const targetStepId = edge.targetPosition != null
        ? insertedSteps.find((s) => s.position === edge.targetPosition)?.id ?? null
        : null;
      const { error: edgeError } = await supabase.from('workflow_edges').insert({
        workflow_id: payload.id,
        workspace_id: workspaceId,
        source_step_id: sourceStepId,
        target_step_id: targetStepId,
        source_handle: edge.sourceHandle,
      });
      if (edgeError) return { success: false as const, error: 'Failed to save branch routing' };
    }
  }

  // Also write plain sequential edges between consecutive non-branching
  // steps so the standard "fetch next edge with no handle filter" lookup in
  // executor.ts has something to find beyond default DB ordering.
  //
  // Branch-target positions must NOT also receive an auto-generated
  // sequential edge from whatever step happens to sit immediately before
  // them in the flat step list -- confirmed the hard way live: a route
  // step's "BranchA" target (say, position 2) sits right before another
  // branch's own target (position 3) in the array, and without this guard
  // the auto-chain wired position 2 -> position 3 as if it were plain
  // fallthrough, so a contact correctly routed into BranchA then
  // immediately also ran the unrelated Default branch's step. Once a step
  // position is reachable only via an explicit branch edge, it stays
  // reachable only that way -- no implicit fallthrough into or out of it
  // beyond what its own edges (if any) declare.
  const branchTargetPositions = new Set(
    payload.steps.flatMap((s) => (s.edges || []).map((e) => e.targetPosition)).filter((p): p is number => p != null)
  );
  for (let i = 0; i < payload.steps.length - 1; i++) {
    const current = payload.steps[i];
    if (current.edges && current.edges.length > 0) continue; // route/split already wrote its own edges
    const next = payload.steps[i + 1];
    if (branchTargetPositions.has(next.position)) continue; // next step is only reachable via an explicit branch edge
    const sourceStepId = insertedSteps.find((s) => s.position === current.position)?.id;
    const targetStepId = insertedSteps.find((s) => s.position === next.position)?.id;
    if (!sourceStepId || !targetStepId) continue;
    // source_handle is NOT NULL live (confirmed the hard way: a null value
    // here fails every plain-sequencing edge insert with a 23502 constraint
    // violation) -- executor.ts's standard-progression lookup doesn't filter
    // on this column at all, so any non-null placeholder is correct.
    const { error: seqEdgeError } = await supabase.from('workflow_edges').insert({
      workflow_id: payload.id, workspace_id: workspaceId, source_step_id: sourceStepId, target_step_id: targetStepId, source_handle: 'next',
    });
    if (seqEdgeError) return { success: false as const, error: 'Failed to save step sequencing' };
  }

  revalidatePath('/automations');
  revalidatePath(`/automations/${payload.id}/edit`);
  return { success: true as const };
}
