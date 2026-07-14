'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Trash2, Plus, ArrowRight, Save, Clock, Mail, ShieldAlert, Sparkles } from 'lucide-react';

interface WorkflowEditorProps {
  workflowId: string;
  onSaved: () => void;
}

export function WorkflowEditor({ workflowId, onSaved }: WorkflowEditorProps) {
  const supabase = createClient();
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('form_submitted');
  const [steps, setSteps] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [owners, setOwners] = useState<any[]>([]);
  const [stages, setStages] = useState<any[]>([]);

  useEffect(() => {
    async function loadWorkflow() {
      // 1. Fetch workflow metadata
      const { data: wf } = await supabase
        .from('workflows')
        .select('*')
        .eq('id', workflowId)
        .single();

      if (wf) {
        setName(wf.name);
        setTriggerType(wf.trigger_type);

        // Fetch workspace members for owner assignment
        const { data: members } = await supabase
          .from('workspace_members')
          .select('user_id, user:users(first_name, last_name)')
          .eq('workspace_id', wf.workspace_id);
        if (members) {
          setOwners(members.map((m: any) => ({
            id: m.user_id,
            name: m.user ? `${m.user.first_name} ${m.user.last_name}`.trim() : 'Unknown Personnel'
          })));
        }

        // Fetch pipeline stages
        const { data: pipelineStages } = await supabase
          .from('pipeline_stages')
          .select('id, name, pipeline:pipelines(name)')
          .eq('workspace_id', wf.workspace_id)
          .order('position', { ascending: true });
        if (pipelineStages) {
          setStages(pipelineStages);
        }
      }

      // 2. Fetch steps
      const { data: stps } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('position', { ascending: true });

      setSteps(stps || []);
    }
    loadWorkflow();
  }, [workflowId]);

  const addStep = () => {
    const newStep = {
      id: crypto.randomUUID(),
      type: 'send_email',
      position: steps.length + 1,
      config: {
        templateType: 'confirmation',
        subject: 'Submission confirmation',
        body: 'Hi {{name}},\nThank you for submitting our form!',
        delaySeconds: 0
      }
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (idx: number) => {
    const nextSteps = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, position: i + 1 }));
    setSteps(nextSteps);
  };

  const updateStepType = (idx: number, type: string) => {
    const nextSteps = [...steps];
    nextSteps[idx].type = type;
    // Set matching defaults
    if (type === 'wait') {
      nextSteps[idx].config = { delaySeconds: 10 };
    } else if (type === 'apply_tags') {
      nextSteps[idx].config = { tags: ['Qualified'] };
    } else if (type === 'create_task') {
      nextSteps[idx].config = { title: 'Follow up contact', priority: 'normal' };
    } else if (type === 'if_else') {
      nextSteps[idx].config = {
        conditions: [{ type: 'completion_percentage', operator: 'equals', value: '100' }],
        matchAction: 'continue',
        fallbackAction: 'stop'
      };
    } else if (type === 'assign_owner') {
      nextSteps[idx].config = { ownerId: '' };
    } else if (type === 'update_pipeline') {
      nextSteps[idx].config = { stageId: '' };
    } else if (type === 'create_note') {
      nextSteps[idx].config = { content: '' };
    } else {
      nextSteps[idx].config = { templateType: 'confirmation', subject: 'Subject', body: 'Body' };
    }
    setSteps(nextSteps);
  };

  const updateStepConfig = (idx: number, key: string, val: any) => {
    const nextSteps = [...steps];
    nextSteps[idx].config = { ...nextSteps[idx].config, [key]: val };
    setSteps(nextSteps);
  };

  const saveWorkflow = async () => {
    setSaving(true);
    try {
      // 1. Update workflow metadata
      await supabase
        .from('workflows')
        .update({ name, trigger_type: triggerType, updated_at: new Date().toISOString() })
        .eq('id', workflowId);

      // 2. Delete existing steps
      await supabase.from('workflow_steps').delete().eq('workflow_id', workflowId);

      // 3. Re-insert updated steps list
      if (steps.length > 0) {
        const payload = steps.map((s, idx) => ({
          workflow_id: workflowId,
          workspace_id: s.workspace_id || '00000000-0000-0000-0000-000000000000', // resolved by Trigger table defaults in DB or insert trigger
          position: idx + 1,
          type: s.type,
          config: s.config
        }));

        // Fetch workspaceId from workflow metadata to ensure valid insert
        const { data: w } = await supabase.from('workflows').select('workspace_id').eq('id', workflowId).single();
        if (w) {
          payload.forEach(item => {
            item.workspace_id = w.workspace_id;
          });
        }

        const { error } = await supabase.from('workflow_steps').insert(payload);
        if (error) throw error;
      }

      toast.success('Workflow saved successfully!');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save workflow configurations');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 bg-white border border-dash-border rounded-2xl flex flex-col overflow-hidden p-6">
      
      {/* Editor topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-dash-border pb-4 mb-6">
        <div className="flex-1 flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text font-bold w-64 focus:outline-none"
            placeholder="Workflow Name"
          />
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text focus:outline-none cursor-pointer"
          >
            <option value="form_submitted" className="bg-white">Trigger: Form Submitted</option>
            <option value="step_completed" className="bg-white">Trigger: Step Completed</option>
            <option value="form_viewed" className="bg-white">Trigger: Form Opened</option>
            <option value="recovery_link_opened" className="bg-white">Trigger: Recovery Link Opened</option>
            <option value="partial_abandoned" className="bg-white">Trigger: Submission Abandoned</option>
          </select>
        </div>
        <button
          onClick={saveWorkflow}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-xs font-bold transition-colors motion-reduce:transition-none"
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save workflow'}
        </button>
      </div>

      {/* Steps Builder Chain */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
        {steps.map((step, idx) => (
          <div key={step.id || idx} className="p-4 bg-dash-surface border border-dash-border rounded-2xl flex flex-col gap-3 relative">
            
            {/* Step header selector */}
            <div className="flex items-center justify-between border-b border-dash-border pb-2.5">
              <span className="text-[10px] font-bold !text-dash-textMuted">
                Action step {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={step.type}
                  onChange={(e) => updateStepType(idx, e.target.value)}
                  className="bg-dash-surface border border-dash-border rounded-lg px-2.5 py-1 text-[11px] !text-dash-text focus:outline-none cursor-pointer"
                >
                  <option value="send_email" className="bg-white">Send Email</option>
                  <option value="wait" className="bg-white">Delay Action</option>
                  <option value="if_else" className="bg-white">Conditional Branch</option>
                  <option value="create_task" className="bg-white">CRM: Create Task</option>
                  <option value="apply_tags" className="bg-white">CRM: Apply Tags</option>
                  <option value="assign_owner" className="bg-white">CRM: Assign Owner</option>
                  <option value="update_pipeline" className="bg-white">CRM: Update Pipeline</option>
                  <option value="create_note" className="bg-white">CRM: Create Note</option>
                </select>
                <button
                  onClick={() => removeStep(idx)}
                  className="p-1 hover:bg-red/10 text-red hover:text-red rounded transition-colors motion-reduce:transition-none"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Custom config forms based on type */}
            {step.type === 'send_email' && (
              <div className="flex flex-col gap-3 text-xs">
                <input
                  type="text"
                  value={step.config?.subject || ''}
                  onChange={(e) => updateStepConfig(idx, 'subject', e.target.value)}
                  className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 !text-dash-text"
                  placeholder="Email Subject"
                />
                <textarea
                  value={step.config?.body || ''}
                  onChange={(e) => updateStepConfig(idx, 'body', e.target.value)}
                  rows={2}
                  className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 !text-dash-text font-mono text-[11px]"
                  placeholder="Email HTML/Body Text (supports {{name}} tags)"
                />
              </div>
            )}

            {step.type === 'wait' && (
              <div className="flex items-center gap-2 text-xs">
                <Clock size={12} className="text-dash-accent" />
                <span>Delay duration:</span>
                <input
                  type="number"
                  value={step.config?.delaySeconds || 0}
                  onChange={(e) => updateStepConfig(idx, 'delaySeconds', parseInt(e.target.value, 10))}
                  className="bg-dash-surface border border-dash-border rounded-xl px-3 py-1.5 !text-dash-text w-20 text-center"
                />
                <span>seconds</span>
              </div>
            )}

            {step.type === 'apply_tags' && (
              <input
                type="text"
                value={
                  Array.isArray(step.config?.tags)
                    ? step.config.tags.join(', ')
                    : typeof step.config?.tags === 'string'
                    ? step.config.tags
                    : ''
                }
                onChange={(e) => updateStepConfig(idx, 'tags', e.target.value.split(',').map(s => s.trim()))}
                className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text"
                placeholder="Comma separated tags (e.g. Lead, High-Value)"
              />
            )}

            {step.type === 'create_task' && (
              <div className="flex gap-2 text-xs">
                <input
                  type="text"
                  value={step.config?.title || ''}
                  onChange={(e) => updateStepConfig(idx, 'title', e.target.value)}
                  className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 !text-dash-text flex-1"
                  placeholder="Task title"
                />
                <select
                  value={step.config?.priority || 'normal'}
                  onChange={(e) => updateStepConfig(idx, 'priority', e.target.value)}
                  className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 !text-dash-text"
                >
                  <option value="low" className="bg-white">Low</option>
                  <option value="normal" className="bg-white">Normal</option>
                  <option value="high" className="bg-white">High</option>
                </select>
              </div>
            )}

            {step.type === 'if_else' && (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-dash-surface rounded-xl border border-dash-border text-[11px]">
                  <span>Condition type: Field validation</span>
                  <span className="font-bold text-dash-accent">({step.config?.conditions?.[0]?.type || 'completion_percentage'})</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-dash-accent/10 p-2 rounded-xl text-[10px] text-dash-accent border border-dash-accent/10">
                    <strong>Match path:</strong> Continue workflow execution
                  </div>
                  <div className="flex-1 bg-dash-surface p-2 rounded-xl text-[10px] !text-dash-textMuted border border-dash-border">
                    <strong>Fallback path:</strong> Stop execution run
                  </div>
                </div>
              </div>
            )}

            {step.type === 'assign_owner' && (
              <div className="flex items-center gap-2 text-xs">
                <span>Assign to owner:</span>
                <select
                  value={step.config?.ownerId || ''}
                  onChange={(e) => updateStepConfig(idx, 'ownerId', e.target.value)}
                  className="bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text focus:outline-none cursor-pointer"
                >
                  <option value="">Select Owner...</option>
                  {owners.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>
            )}

            {step.type === 'update_pipeline' && (
              <div className="flex items-center gap-2 text-xs">
                <span>Move opportunity to stage:</span>
                <select
                  value={step.config?.stageId || step.config?.stage || ''}
                  onChange={(e) => updateStepConfig(idx, 'stageId', e.target.value)}
                  className="bg-white border border-dash-border rounded-xl px-3 py-2 text-xs !text-dash-text focus:outline-none cursor-pointer"
                >
                  <option value="">Select Stage...</option>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.pipeline?.name ? `${s.pipeline.name} → ` : ''}{s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {step.type === 'create_note' && (
              <div className="flex flex-col gap-2 text-xs">
                <span>Add note to contact profile:</span>
                <textarea
                  value={step.config?.content || ''}
                  onChange={(e) => updateStepConfig(idx, 'content', e.target.value)}
                  rows={2}
                  className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2 !text-dash-text font-mono text-[11px]"
                  placeholder="Note content (supports {{name}} tags)"
                />
              </div>
            )}

          </div>
        ))}

        <button
          onClick={addStep}
          className="flex items-center justify-center gap-1.5 p-4 border border-dashed border-dash-border hover:border-dash-text/20 bg-transparent !text-dash-textMuted hover:!text-dash-text rounded-2xl text-[10px] font-bold transition-colors motion-reduce:transition-none mt-2"
        >
          <Plus size={14} /> Add action step
        </button>
      </div>

    </div>
  );
}
