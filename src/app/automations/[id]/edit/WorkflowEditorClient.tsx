'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput, DashFormField } from '@/components/dashboard-ui/FormField';
import { DashCard } from '@/components/dashboard-ui/Card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup
} from '@/components/ui/select';
import { STEP_TYPES } from '@/lib/automation/actionConfigSchema';
import { StepConfigForm } from '@/components/automation/StepConfigForm';
import { RouteBranchEditor, SplitEditor, RouteBranch } from '@/components/automation/BranchListEditor';
import { ReferenceData } from '@/components/automation/EntityPickers';
import { saveWorkflowEditor } from '@/app/actions/automation_editor';
import { cn } from '@/lib/utils';

// Curated to only the trigger_type values that some real code path actually
// calls EventBus.publishEvent(...) with (re-confirmed by grepping every
// publishEvent call site) — not the full EVENT_TRIGGERS vocabulary. Listing
// a trigger here that nothing ever publishes lets a user build a workflow
// that silently never fires; see EVENT_TRIGGERS in EventBus.ts for the
// registered-but-unpublished values still deliberately excluded (cert_issued,
// cert_expiring, tag_confidence_changed) — cert_issued/cert_expiring have no
// supporting feature yet (certificates aren't persisted anywhere), and
// tag_confidence_changed needs a product decision on its shared-value
// semantics before it's wired. Engine A only — no form_submitted/Engine-B
// trigger.
const TRIGGER_GROUPS: { label: string; options: { value: string; label: string }[] }[] = [
  { label: 'CRM / Contact', options: [
    { value: 'contact_created', label: 'Contact created' },
    { value: 'opportunity_stage_changed', label: 'Opportunity stage changed' },
    { value: 'appointment_booked', label: 'Appointment booked' },
    { value: 'invoice_paid', label: 'Invoice paid' },
    { value: 'live_session_booked', label: 'Live session booked' },
  ]},
  { label: 'Tags', options: [
    { value: 'tag_added', label: 'Tag added' },
    { value: 'tag_removed', label: 'Tag removed' },
    { value: 'tag_updated', label: 'Tag updated' },
    { value: 'tag_expired', label: 'Tag expired' },
  ]},
  { label: 'LMS / Course', options: [
    { value: 'student_enrolled_course', label: 'Student enrolled in course' },
    { value: 'student_enrolled_bundle', label: 'Student enrolled in bundle' },
    { value: 'course_completed', label: 'Course completed' },
    { value: 'module_completed', label: 'Module completed' },
    { value: 'lesson_completed', label: 'Lesson completed' },
    { value: 'quiz_passed', label: 'Quiz passed' },
    { value: 'quiz_failed', label: 'Quiz failed' },
    { value: 'quiz_limit_reached', label: 'Quiz attempt limit reached' },
    { value: 'course_revoked', label: 'Course access revoked' },
    { value: 'struggle_threshold_crossed', label: 'Struggle score threshold crossed' },
    { value: 'student_inactive', label: 'Student inactive (14+ days)' },
    { value: 'assignment_submitted', label: 'Assignment submitted' },
    { value: 'assignment_graded', label: 'Assignment graded' },
    { value: 'course_expiring', label: 'Course access expiring soon' },
  ]},
  { label: 'Marketing / Payments', options: [
    { value: 'funnel_subscribed', label: 'Funnel form subscribed' },
    { value: 'payfast_payment_course', label: 'PayFast course payment received' },
  ]},
];

interface EditorStep {
  position: number;
  type: string;
  config: Record<string, any>;
  branches?: RouteBranch[];
  targets?: Record<string, number | null>;
  splitPercentage?: number;
  targetA?: number | null;
  targetB?: number | null;
}

function workflowStepsToEditorSteps(steps: any[], edges: any[]): EditorStep[] {
  return steps.map((s) => {
    const stepEdges = edges.filter((e) => e.source_step_id === s.id);
    const idToPosition = (id: string | null) => steps.find((st) => st.id === id)?.position ?? null;
    if (s.type === 'route') {
      const branches: RouteBranch[] = s.config?.branches || [];
      const targets: Record<string, number | null> = {};
      for (const e of stepEdges) {
        targets[e.source_handle || 'default'] = idToPosition(e.target_step_id);
      }
      return { position: s.position, type: s.type, config: s.config || {}, branches, targets };
    }
    if (s.type === 'split') {
      const targetA = idToPosition(stepEdges.find((e) => e.source_handle === 'A')?.target_step_id ?? null);
      const targetB = idToPosition(stepEdges.find((e) => e.source_handle === 'B')?.target_step_id ?? null);
      return { position: s.position, type: s.type, config: s.config || {}, splitPercentage: s.config?.splitPercentage ?? 50, targetA, targetB };
    }
    return { position: s.position, type: s.type, config: s.config || {} };
  });
}

export function WorkflowEditorClient({
  workflow, referenceData,
}: {
  workflow: any;
  referenceData: ReferenceData;
}) {
  const router = useRouter();
  const [name, setName] = useState(workflow.name || '');
  const [triggerType, setTriggerType] = useState(workflow.trigger_type || 'contact_created');
  const [isActive, setIsActive] = useState(!!workflow.is_active);
  const [steps, setSteps] = useState<EditorStep[]>(() =>
    workflowStepsToEditorSteps(workflow.workflow_steps || [], workflow.workflow_edges || [])
  );
  const [saving, setSaving] = useState(false);

  const renumbered = () => steps.map((s, i) => ({ ...s, position: i + 1 }));

  const addStep = () => {
    const newSteps = renumbered();
    newSteps.push({ position: newSteps.length + 1, type: 'send_email', config: {} });
    setSteps(newSteps);
  };
  const removeStep = (idx: number) => setSteps(renumbered().filter((_, i) => i !== idx));
  const moveStep = (idx: number, dir: 'up' | 'down') => {
    if (dir === 'up' && idx === 0) return;
    if (dir === 'down' && idx === steps.length - 1) return;
    const arr = renumbered();
    const target = dir === 'up' ? idx - 1 : idx + 1;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setSteps(arr.map((s, i) => ({ ...s, position: i + 1 })));
  };
  const updateStep = (idx: number, patch: Partial<EditorStep>) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const stepOptionsExcluding = (excludePosition: number) =>
    renumbered()
      .filter((s) => s.position !== excludePosition)
      .map((s) => ({ position: s.position, label: `Step ${s.position}: ${s.type.replace(/_/g, ' ')}` }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalSteps = renumbered().map((s) => {
        if (s.type === 'route') {
          const branches = s.branches || [];
          const targets = s.targets || {};
          return {
            position: s.position,
            type: s.type,
            config: { branches: branches.map((b) => ({ name: b.name, is_default: !!b.is_default, conditions: b.conditions })) },
            edges: branches.map((b) => ({ sourceHandle: b.is_default ? 'default' : b.name, targetPosition: targets[b.is_default ? 'default' : b.name] ?? null })),
          };
        }
        if (s.type === 'split') {
          return {
            position: s.position,
            type: s.type,
            config: { splitPercentage: s.splitPercentage ?? 50 },
            edges: [
              { sourceHandle: 'A', targetPosition: s.targetA ?? null },
              { sourceHandle: 'B', targetPosition: s.targetB ?? null },
            ],
          };
        }
        return { position: s.position, type: s.type, config: s.config };
      });

      const res = await saveWorkflowEditor({
        id: workflow.id, name, trigger_type: triggerType, is_active: isActive, steps: finalSteps,
      });
      if (!res.success) { toast.error(res.error); return; }
      toast.success('Workflow saved');
      router.push('/automations');
      router.refresh();
    } catch (e) {
      toast.error('Failed to save workflow');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold !text-dash-text flex items-center gap-2"><Zap className="text-dash-accent" /> Edit workflow</h1>
        <div className="flex gap-2">
          <DashButton variant="secondary" onClick={() => router.push('/automations')}>Cancel</DashButton>
          <DashButton onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save workflow'}</DashButton>
        </div>
      </div>

      <DashCard padding="default" className="space-y-4">
        <DashFormField label="Workflow name" required>
          <DashInput value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
        </DashFormField>
        <DashFormField label="Trigger event" required>
          <Select value={triggerType} onValueChange={setTriggerType}>
            <SelectTrigger className="h-11 border-dash-border rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl max-h-80 p-1.5">
              {TRIGGER_GROUPS.map((group, gIdx) => (
                <SelectGroup key={group.label}>
                  <div className={cn(
                    "px-2.5 pb-1.5 text-[10.5px] font-extrabold uppercase tracking-wider !text-dash-accent",
                    gIdx > 0 && "mt-2 pt-2.5 border-t border-dash-border/70"
                  )}>
                    {group.label}
                  </div>
                  {group.options.map((o) => (
                    <SelectItem
                      key={o.value}
                      value={o.value}
                      className="text-[13.5px] font-semibold !text-dash-text rounded-lg py-2 focus:!bg-dash-accent/10 focus:!text-dash-accent data-[state=checked]:!text-dash-accent data-[state=checked]:font-bold"
                    >
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </DashFormField>
        <label className="flex items-center gap-2 text-[12px] font-bold !text-dash-text">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
      </DashCard>

      <div className="space-y-3">
        <p className="text-sm font-bold !text-dash-text">Steps</p>
        {steps.length === 0 && (
          <div className="text-center p-8 border border-dashed border-dash-border rounded-2xl !text-dash-textMuted text-sm">No steps yet.</div>
        )}
        {steps.map((step, idx) => (
          <DashCard key={idx} padding="default" className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold !text-dash-textMuted w-14 shrink-0">Step {idx + 1}</span>
              <Select value={step.type} onValueChange={(v) => updateStep(idx, { type: v, config: {}, branches: undefined, targets: undefined })}>
                <SelectTrigger className="h-10 flex-1 border-dash-border rounded-xl text-[13px]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-white border border-dash-border rounded-xl shadow-xl max-h-80 p-1.5">
                  {STEP_TYPES.map((a) => (
                    <SelectItem
                      key={a.value}
                      value={a.value}
                      className="text-[13.5px] font-semibold !text-dash-text rounded-lg py-2 focus:!bg-dash-accent/10 focus:!text-dash-accent data-[state=checked]:!text-dash-accent data-[state=checked]:font-bold"
                    >
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => moveStep(idx, 'up')} disabled={idx === 0} className="p-2 rounded-lg hover:bg-dash-surface disabled:opacity-30"><ArrowUp size={14} /></button>
                <button type="button" onClick={() => moveStep(idx, 'down')} disabled={idx === steps.length - 1} className="p-2 rounded-lg hover:bg-dash-surface disabled:opacity-30"><ArrowDown size={14} /></button>
                <button type="button" onClick={() => removeStep(idx)} className="p-2 rounded-lg hover:bg-red/10 text-red"><Trash2 size={14} /></button>
              </div>
            </div>

            {step.type === 'route' && (
              <RouteBranchEditor
                branches={step.branches || []}
                onChange={(branches) => updateStep(idx, { branches })}
                stepOptions={stepOptionsExcluding(idx + 1)}
                targets={step.targets || {}}
                onTargetsChange={(targets) => updateStep(idx, { targets })}
              />
            )}
            {step.type === 'split' && (
              <SplitEditor
                splitPercentage={step.splitPercentage ?? 50}
                onSplitPercentageChange={(v) => updateStep(idx, { splitPercentage: v })}
                stepOptions={stepOptionsExcluding(idx + 1)}
                targetA={step.targetA ?? null}
                targetB={step.targetB ?? null}
                onTargetAChange={(v) => updateStep(idx, { targetA: v })}
                onTargetBChange={(v) => updateStep(idx, { targetB: v })}
              />
            )}
            {step.type !== 'route' && step.type !== 'split' && (
              <StepConfigForm type={step.type} config={step.config} onChange={(config) => updateStep(idx, { config })} referenceData={referenceData} />
            )}
          </DashCard>
        ))}
        <DashButton variant="secondary" onClick={addStep}><Plus size={14} /> Add step</DashButton>
      </div>
    </div>
  );
}
