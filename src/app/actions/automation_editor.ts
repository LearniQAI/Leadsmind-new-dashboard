'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, requireWorkspaceAccess } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// Reused by seedSARecipes() (automation-workspace.ts) so seed-inserted
// recipes get the same edge wiring a user gets by saving a plain,
// non-branching step sequence through this editor. A workflow with steps
// but no workflow_edges row between them stops after the first step —
// executor.ts's progression lookup has no position-based fallback, only
// this table (confirmed live: seedSARecipes' 2-step recipe never ran its
// second step until this helper was reused here).
export async function insertSequentialEdge(
  supabase: any,
  workspaceId: string,
  workflowId: string,
  sourceStepId: string,
  targetStepId: string
) {
  return supabase.from('workflow_edges').insert({
    workflow_id: workflowId,
    workspace_id: workspaceId,
    source_step_id: sourceStepId,
    target_step_id: targetStepId,
    source_handle: 'next',
  });
}

// ---------- Reference data for the editor's entity pickers ----------
export async function getEditorReferenceData() {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { success: false as const, error: 'No active workspace' };
  const supabase = await createServerClient();

  const [tagsRes, pipelinesRes, membersRes, coursesRes, bundlesRes, funnelsRes] = await Promise.all([
    supabase.from('tags').select('id, name').eq('workspace_id', workspaceId).order('name'),
    supabase.from('pipelines').select('id, name, pipeline_stages(id, name, position)').eq('workspace_id', workspaceId),
    supabase.from('workspace_members').select('user_id').eq('workspace_id', workspaceId),
    supabase.from('courses').select('id, title').eq('workspace_id', workspaceId).order('title'),
    supabase.from('lms_bundles').select('id, name').eq('workspace_id', workspaceId).order('name'),
    supabase.from('funnels').select('id, name').eq('workspace_id', workspaceId).order('name'),
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
      funnels: funnelsRes.data || [],
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
  // Existing workflow_steps.id, when the caller loaded this step from the database. Lets the
  // save keep the step's identity (and therefore running contacts' position) through edits,
  // reorders and removals of its neighbours.
  id?: string;
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
  // Omitted entirely by the editor form (Description was removed from the
  // "Edit workflow" UI) -- left optional and only written when explicitly
  // provided, so existing workflows with real description data already
  // stored aren't wiped out by saves made through this form.
  description?: string;
  trigger_type: string;
  // Only written when provided (the generic editor has no trigger-filter UI
  // and must not wipe a config set elsewhere).
  trigger_config?: Record<string, unknown>;
  is_active: boolean;
  steps: EditorStepInput[];
}

// ---------- Save (atomic, edit-safe) ----------
// The whole save runs as ONE transaction in save_workflow_graph (see its migration): steps are
// matched to their existing rows and updated in place, so contacts already running through the
// workflow keep their position; a step that is removed hands its running contacts to the next
// surviving step instead of dropping them. A failure anywhere rolls the whole save back --
// no half-built workflow. `id` on a step (from the loaded workflow) says which existing step it
// is; without ids the steps are matched by position + type.
export async function saveWorkflowEditor(payload: SaveWorkflowPayload) {
  const { workspaceId } = await requireWorkspaceAccess();
  const supabase = await createServerClient();

  const { data: owned } = await supabase.from('workflows').select('id').eq('id', payload.id).eq('workspace_id', workspaceId).maybeSingle();
  if (!owned) return { success: false as const, error: 'Workflow not found' };

  const steps = [...payload.steps].sort((a, b) => a.position - b.position);

  // Edges are expressed by step POSITION; the database resolves them to ids after it has
  // matched/inserted the steps. Route/split steps carry explicit edges; every other step
  // auto-chains to the next one (executor.ts's progression reads only workflow_edges).
  const edges: { sourcePosition: number; targetPosition: number | null; handle: string }[] = [];
  for (const step of steps) {
    for (const edge of step.edges ?? []) {
      edges.push({ sourcePosition: step.position, targetPosition: edge.targetPosition, handle: edge.sourceHandle });
    }
  }
  // A position reachable only via an explicit branch edge must not ALSO get an implicit
  // fallthrough from the step before it (that made a routed contact run the unrelated Default
  // branch's step too). source_handle is NOT NULL live; the executor ignores its value here.
  const branchTargetPositions = new Set(
    steps.flatMap((s) => (s.edges || []).map((e) => e.targetPosition)).filter((p): p is number => p != null)
  );
  for (let i = 0; i < steps.length - 1; i++) {
    const current = steps[i];
    if (current.edges && current.edges.length > 0) continue;
    const next = steps[i + 1];
    if (branchTargetPositions.has(next.position)) continue;
    edges.push({ sourcePosition: current.position, targetPosition: next.position, handle: 'next' });
  }

  const fields: Record<string, unknown> = {
    name: payload.name,
    trigger_type: payload.trigger_type,
    is_active: payload.is_active,
  };
  if (payload.description !== undefined) fields.description = payload.description;
  if (payload.trigger_config !== undefined) fields.trigger_config = payload.trigger_config;

  const { error } = await supabase.rpc('save_workflow_graph', {
    p_workflow_id: payload.id,
    p_workspace_id: workspaceId,
    p_fields: fields,
    p_steps: steps.map((s) => ({ id: s.id ?? null, position: s.position, type: s.type, config: s.config })),
    p_edges: edges,
  });
  if (error) return { success: false as const, error: 'Failed to save workflow' };

  revalidatePath('/automations');
  revalidatePath(`/automations/${payload.id}/edit`);
  return { success: true as const };
}
