'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { updatePipelineStages, deleteStage } from '@/app/actions/pipelines';
import { PipelineStage } from '@/types/crm';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

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
    if (!res.success) return toast.error(res.error);
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
     <div key={stage.id} className="flex items-center gap-3 bg-white/[0.02] border border-white/5 rounded-2xl px-4 py-3 group animate-in fade-in slide-in-from-top-2">
      <div className="card__icon !w-8 !h-8 !text-xs !rounded-lg">
       {i + 1}
      </div>
      <Input
       value={stage.name}
       onChange={e => updateStageName(i, e.target.value)}
       className="bg-transparent border-none text-white h-9 focus-visible:ring-0 px-0 font-bold"
      />
      <button
       onClick={() => removeStage(stage.id, i)}
       className="text-white/10 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 p-2"
      >
       <Trash2 className="h-4 w-4" />
      </button>
     </div>
    ))}
   </div>

   <div className="flex items-center gap-3 pt-4">
    <Button
     type="button"
     variant="outline"
     onClick={addStage}
     className="border-white/5 bg-white/5 text-white hover:bg-white/10 rounded-xl h-11 px-6 gap-2 font-bold flex-1"
    >
     <Plus className="h-4 w-4" /> Add Stage
    </Button>
    <Button
     onClick={handleSave}
     disabled={isPending}
     className="btn btn-primary !h-11 !px-10 !rounded-xl !text-[10px] uppercase font-black tracking-widest shadow-lg shadow-primary/20"
    >
     {isPending ? 'Saving...' : 'Save Changes'}
    </Button>
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
