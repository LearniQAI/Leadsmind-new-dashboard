'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Trash2, ArrowLeft, Target } from 'lucide-react';
import { createPipeline } from '@/app/actions/pipelines';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

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
        <div className="app__slide-wrapper max-w-2xl mx-auto py-10">
          <div className="space-y-10">
            <div className="px-4">
              <button onClick={() => router.back()} className="flex items-center gap-2 text-white/40 hover:text-white text-[10px] uppercase font-black tracking-widest mb-8 transition-colors group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" /> Back to Pipelines
              </button>
              <h1 className="card__title !text-4xl uppercase italic mb-2">Create Pipeline</h1>
              <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Configure your sales stages to track deals end-to-end</p>
            </div>

            <form onSubmit={handleSubmit} className="card__wrapper !p-10 space-y-10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 text-primary/5">
                <Target size={120} />
              </div>

              <div className="space-y-3 relative z-10">
                <Label className="card__sub-title !text-[10px] uppercase tracking-widest !mb-0 px-1">Pipeline Name</Label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sales Pipeline"
                  className="bg-white/[0.03] border-white/10 text-white h-14 rounded-2xl focus-visible:ring-primary/50 text-lg font-bold"
                />
              </div>

              <div className="space-y-6 relative z-10">
                <Label className="card__sub-title !text-[10px] uppercase tracking-widest !mb-0 px-1">Sales Stages (in order)</Label>
                <div className="space-y-3">
                  {stages.map((stage, i) => (
                    <div key={i} className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl px-5 py-4 group animate-in slide-in-from-left-4 duration-300" style={{ animationDelay: `${i * 100}ms` }}>
                      <div className="card__icon !w-10 !h-10 !text-xs">
                        {i + 1}
                      </div>
                      <span className="text-base font-bold text-white tracking-tight">{stage}</span>
                      <button
                        type="button"
                        onClick={() => removeStage(i)}
                        className="text-white/10 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 p-2"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Input
                    value={newStage}
                    onChange={e => setNewStage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addStage())}
                    placeholder="Enter stage name..."
                    className="bg-white/[0.03] border-white/10 text-white h-14 rounded-2xl focus-visible:ring-primary/50"
                  />
                  <Button type="button" onClick={addStage} variant="outline" className="h-14 w-14 border-white/10 bg-white/5 text-white hover:bg-white/10 rounded-2xl shrink-0 transition-all active:scale-95">
                    <Plus className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-6 relative z-10">
                <Button type="button" variant="ghost" onClick={() => router.back()} className="text-white/40 hover:text-white h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-[11px]" disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="btn btn-primary !h-14 !px-10 !rounded-2xl !text-[11px] uppercase font-black tracking-widest flex-1 shadow-2xl shadow-primary/20 transition-all hover:scale-[1.02]">
                  {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Creating...</> : 'Create Pipeline'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
