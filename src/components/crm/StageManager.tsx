'use client';

import { useState } from 'react';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { updatePipelineStages, deleteStage } from '@/app/actions/pipelines';
import { PipelineStage } from '@/types/crm';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashInput } from '@/components/dashboard-ui/FormField';

interface StageManagerProps {
 pipelineId: string;
 initialStages: PipelineStage[];
}

export function StageManager({ pipelineId, initialStages }: StageManagerProps) {
 const [stages, setStages] = useState(initialStages.map(s => ({ id: s.id, name: s.name })));
 const [isPending, setIsPending] = useState(false);
 const [confirmConfig, setConfirmConfig] = useState<{
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
 } | null>(null);

 const addStage = () => {
  setStages([...stages, { id: `new-${Date.now()}`, name: 'New Stage' }]);
 };

 const removeStage = async (id: string, index: number) => {
  const action = async () => {
   if (!id.startsWith('new-')) {
    const res = await deleteStage(id);
    if ('error' in res) return toast.error(res.error);
   }
   setStages(stages.filter((_, i) => i !== index));
  };

  if (!id.startsWith('new-')) {
   setConfirmConfig({
    isOpen: true,
    title: 'Delete Stage?',
    description: 'Are you sure? This will delete all deals in this stage.',
    confirmLabel: 'Delete',
    onConfirm: action
   });
  } else {
   action();
  }
 };

 const updateStageName = (index: number, name: string) => {
  const newStages = [...stages];
  newStages[index].name = name;
  setStages(newStages);
 };

 const handleSave = async () => {
  setIsPending(true);
  try {
   const res = await updatePipelineStages(pipelineId, stages);
   if (res.success) {
    toast.success('Stages updated');
   } else {
    toast.error(res.error);
   }
  } catch {
   toast.error('Failed to save stages');
  } finally {
   setIsPending(false);
  }
 };

 return (
  <div className="space-y-6">
   <div className="space-y-3">
    {stages.map((stage, i) => (
     <div key={stage.id} className="flex items-center gap-3 bg-dash-surface border border-dash-border rounded-2xl px-4 py-3 group animate-in fade-in slide-in-from-top-2 motion-reduce:animate-none">
      <div className="w-8 h-8 rounded-lg bg-white border border-dash-border flex items-center justify-center text-xs font-bold text-dash-accent shrink-0">
       {i + 1}
      </div>
      <DashInput
       value={stage.name}
       onChange={e => updateStageName(i, e.target.value)}
       className="bg-transparent border-none h-9 focus-visible:ring-0 px-0 font-bold"
      />
      <button
       onClick={() => removeStage(stage.id, i)}
       className="text-dash-border hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-2"
      >
       <Trash2 className="h-4 w-4" />
      </button>
     </div>
    ))}
   </div>

   <div className="flex items-center gap-3 pt-4">
    <DashButton
     type="button"
     variant="secondary"
     onClick={addStage}
     className="h-11 px-6 gap-2 flex-1"
    >
     <Plus className="h-4 w-4" /> Add Stage
    </DashButton>
    <DashButton
     variant="primary"
     onClick={handleSave}
     disabled={isPending}
     className="h-11 px-10"
    >
     {isPending ? 'Saving...' : 'Save Changes'}
    </DashButton>
   </div>
   {confirmConfig && (
    <ConfirmDialog
     isOpen={confirmConfig.isOpen}
     onClose={() => setConfirmConfig(prev => prev ? { ...prev, isOpen: false } : null)}
     onConfirm={confirmConfig.onConfirm}
     title={confirmConfig.title}
     description={confirmConfig.description}
     confirmLabel={confirmConfig.confirmLabel}
     variant="danger"
    />
   )}
  </div>
 );
}
