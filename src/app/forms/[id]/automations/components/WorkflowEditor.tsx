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
    <div className="flex-1 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col overflow-hidden p-6 font-dm-sans">
      
      {/* Editor topbar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
        <div className="flex-1 flex gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-space-grotesk font-black uppercase tracking-wider w-64 focus:outline-none"
            placeholder="Workflow Name"
          />
          <select
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="form_submitted" className="bg-[#0b132c]">Trigger: Form Submitted</option>
            <option value="step_completed" className="bg-[#0b132c]">Trigger: Step Completed</option>
            <option value="form_viewed" className="bg-[#0b132c]">Trigger: Form Opened</option>
            <option value="recovery_link_opened" className="bg-[#0b132c]">Trigger: Recovery Link Opened</option>
            <option value="partial_abandoned" className="bg-[#0b132c]">Trigger: Submission Abandoned</option>
          </select>
        </div>
        <button
          onClick={saveWorkflow}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
        >
          <Save size={14} /> {saving ? 'Saving...' : 'Save Workflow'}
        </button>
      </div>

      {/* Steps Builder Chain */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar flex flex-col gap-4">
        {steps.map((step, idx) => (
          <div key={step.id || idx} className="p-4 bg-white/2 border border-white/5 rounded-2xl flex flex-col gap-3 relative">
            
            {/* Step header selector */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <span className="text-[10px] font-black tracking-widest text-[#4a5a82] uppercase">
                Action step {idx + 1}
              </span>
              <div className="flex items-center gap-2">
                <select
                  value={step.type}
                  onChange={(e) => updateStepType(idx, e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none cursor-pointer"
                >
                  <option value="send_email" className="bg-[#0b132c]">Send Email</option>
                  <option value="wait" className="bg-[#0b132c]">Delay Action</option>
                  <option value="if_else" className="bg-[#0b132c]">Conditional Branch</option>
                  <option value="create_task" className="bg-[#0b132c]">CRM: Create Task</option>
                  <option value="apply_tags" className="bg-[#0b132c]">CRM: Apply Tags</option>
                  <option value="assign_owner" className="bg-[#0b132c]">CRM: Assign Owner</option>
                  <option value="update_pipeline" className="bg-[#0b132c]">CRM: Update Pipeline</option>
                  <option value="create_note" className="bg-[#0b132c]">CRM: Create Note</option>
                </select>
                <button
                  onClick={() => removeStep(idx)}
                  className="p-1 hover:bg-rose-500/10 text-rose-400 hover:text-rose-500 rounded transition-colors"
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
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                  placeholder="Email Subject"
                />
                <textarea
                  value={step.config?.body || ''}
                  onChange={(e) => updateStepConfig(idx, 'body', e.target.value)}
                  rows={2}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                  placeholder="Email HTML/Body Text (supports {{name}} tags)"
                />
              </div>
            )}

            {step.type === 'wait' && (
              <div className="flex items-center gap-2 text-xs">
                <Clock size={12} className="text-blue-400" />
                <span>Delay duration:</span>
                <input
                  type="number"
                  value={step.config?.delaySeconds || 0}
                  onChange={(e) => updateStepConfig(idx, 'delaySeconds', parseInt(e.target.value, 10))}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-white w-20 text-center"
                />
                <span>seconds</span>
              </div>
            )}

            {step.type === 'apply_tags' && (
              <input
                type="text"
                value={step.config?.tags?.join(', ') || ''}
                onChange={(e) => updateStepConfig(idx, 'tags', e.target.value.split(',').map(s => s.trim()))}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                placeholder="Comma separated tags (e.g. Lead, High-Value)"
              />
            )}

            {step.type === 'create_task' && (
              <div className="flex gap-2 text-xs">
                <input
                  type="text"
                  value={step.config?.title || ''}
                  onChange={(e) => updateStepConfig(idx, 'title', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white flex-1"
                  placeholder="Task title"
                />
                <select
                  value={step.config?.priority || 'normal'}
                  onChange={(e) => updateStepConfig(idx, 'priority', e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  <option value="low" className="bg-[#0b132c]">Low</option>
                  <option value="normal" className="bg-[#0b132c]">Normal</option>
                  <option value="high" className="bg-[#0b132c]">High</option>
                </select>
              </div>
            )}

            {step.type === 'if_else' && (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2 p-2 bg-white/2 rounded-xl border border-white/5 text-[11px]">
                  <span>Condition type: Field validation</span>
                  <span className="font-bold text-[#60a5fa]">({step.config?.conditions?.[0]?.type || 'completion_percentage'})</span>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-[#2563eb]/10 p-2 rounded-xl text-[10px] text-blue-400 border border-blue-500/10">
                    <strong>Match path:</strong> Continue workflow execution
                  </div>
                  <div className="flex-1 bg-white/5 p-2 rounded-xl text-[10px] text-white/40 border border-white/5">
                    <strong>Fallback path:</strong> Stop execution run
                  </div>
                </div>
              </div>
            )}

          </div>
        ))}

        <button
          onClick={addStep}
          className="flex items-center justify-center gap-1.5 p-4 border border-dashed border-white/10 hover:border-white/20 bg-transparent text-white/50 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all mt-2"
        >
          <Plus size={14} /> Add Action Step
        </button>
      </div>

    </div>
  );
}
