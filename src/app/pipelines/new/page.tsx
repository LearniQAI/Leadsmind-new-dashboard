'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ArrowLeft, Target } from 'lucide-react';
import { createPipeline } from '@/app/actions/pipelines';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';

const DEFAULT_STAGES = ['Lead', 'Contacted', 'Proposal', 'Closing'];

export default function NewPipelinePage() {
 const router = useRouter();
 const [name, setName] = useState('Sales Pipeline');
 const [stages, setStages] = useState(DEFAULT_STAGES);
 const [newStage, setNewStage] = useState('');
 const [isPending, setIsPending] = useState(false);

 const addStage = () => {
  if (newStage.trim()) {
   setStages(prev => [...prev, newStage.trim()]);
   setNewStage('');
  }
 };

 const removeStage = (i: number) => {
  setStages(prev => prev.filter((_, idx) => idx !== i));
 };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!name.trim()) return toast.error('Pipeline name is required');
  if (stages.length === 0) return toast.error('Add at least one stage');
  setIsPending(true);
  try {
   const res = await createPipeline({ name, stages });
   if (res.success) {
    toast.success('Pipeline created!');
    router.push('/apps/pipelines');
    router.refresh();
   } else {
    toast.error(res.error || 'Failed to create pipeline');
   }
  } catch {
   toast.error('Something went wrong');
  } finally {
   setIsPending(false);
  }
 };

 return (
  <MetaData pageTitle="Create Pipeline">
   <Wrapper>
    <div className="max-w-2xl mx-auto py-10 px-4">
     <div className="space-y-10">
      <div>
       <button onClick={() => router.back()} className="flex items-center gap-2 !text-dash-textMuted hover:!text-dash-text text-[12px] font-bold tracking-wide mb-8 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to pipelines
       </button>
       <h1 className="text-3xl font-bold !text-dash-text mb-2">Create pipeline</h1>
       <p className="text-[13px] !text-dash-textMuted">Configure your sales stages to track deals end-to-end</p>
      </div>

      <DashCard interactive={false} className="p-10 space-y-10 relative overflow-hidden">
       <form onSubmit={handleSubmit} className="space-y-10">
       <div className="absolute top-0 right-0 p-8 text-dash-accent/5 pointer-events-none">
        <Target size={120} />
       </div>

       <div className="relative z-10">
        <DashFormField label="Pipeline name">
         <DashInput
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Sales Pipeline"
          className="h-14 rounded-2xl text-lg font-bold"
         />
        </DashFormField>
       </div>

       <div className="space-y-6 relative z-10">
        <DashFormField label="Sales stages (in order)">
         <div className="space-y-3">
          {stages.map((stage, i) => (
           <div key={i} className="flex items-center gap-4 bg-dash-surface border border-dash-border rounded-2xl px-5 py-4 group animate-in slide-in-from-left-4 duration-300 motion-reduce:animate-none" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="w-10 h-10 rounded-xl bg-white border border-dash-border flex items-center justify-center text-xs font-bold text-dash-accent shrink-0">
             {i + 1}
            </div>
            <span className="text-base font-bold !text-dash-text tracking-tight">{stage}</span>
            <button
             type="button"
             onClick={() => removeStage(i)}
             className="ml-auto text-dash-border hover:text-red transition-colors opacity-0 group-hover:opacity-100 p-2"
            >
             <Trash2 className="h-5 w-5" />
            </button>
           </div>
          ))}
         </div>
        </DashFormField>

        <div className="flex gap-3 pt-4">
         <DashInput
          value={newStage}
          onChange={e => setNewStage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
          placeholder="Enter stage name..."
          className="h-14 rounded-2xl"
         />
         <DashButton type="button" onClick={addStage} variant="secondary" className="h-14 w-14 rounded-2xl shrink-0 p-0">
          <Plus className="h-6 w-6" />
         </DashButton>
        </div>
       </div>

       <div className="flex items-center gap-4 pt-6 relative z-10">
        <DashButton type="button" variant="ghost" onClick={() => router.back()} className="h-14 px-8 rounded-2xl" disabled={isPending}>
         Cancel
        </DashButton>
        <DashButton type="submit" variant="primary" disabled={isPending} className="h-14 px-10 rounded-2xl flex-1">
         {isPending ? <><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none mr-2" />Creating...</> : 'Create Pipeline'}
        </DashButton>
       </div>
       </form>
      </DashCard>
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
