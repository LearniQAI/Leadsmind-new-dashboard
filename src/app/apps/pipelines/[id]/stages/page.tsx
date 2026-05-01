import { requireAdmin, getCurrentWorkspace } from '@/lib/auth';
import { getPipelineStages, getPipelines } from '@/app/actions/pipelines';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Settings } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StageManager } from '@/components/crm/StageManager';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function PipelineStagesPage({
  params,
}: {
  params: { id: string };
}) {
  await requireAdmin();
  const { id } = params;
  
  const workspace = await getCurrentWorkspace();
  const [pipelinesResult, stagesResult] = await Promise.all([
    getPipelines(),
    getPipelineStages(id),
  ]);

  if (!pipelinesResult.success) {
      return (
          <MetaData pageTitle="Error">
              <Wrapper>
                  <div className="p-10 text-white">Error loading pipeline</div>
              </Wrapper>
          </MetaData>
      );
  }

  const pipeline = pipelinesResult.data?.find(p => p.id === id);
  if (!pipeline) {
      notFound();
  }

  const stages = stagesResult.success ? (stagesResult.data ?? []) : [];

  return (
    <MetaData pageTitle={`${pipeline.name} Stages`}>
      <Wrapper>
        <div className="app__slide-wrapper max-w-4xl mx-auto py-12 px-4">
          <div className="space-y-10">
            <div className="flex items-center gap-6">
              <Link href="/apps/pipelines" className="h-14 w-14 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-xl">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <div>
                <h1 className="card__title !text-4xl uppercase italic mb-2">
                  {pipeline.name} Stages
                </h1>
                <p className="card__sub-title !text-[11px] uppercase tracking-[0.2em]">Define and manage the steps in your sales process</p>
              </div>
            </div>

            <div className="card__wrapper !p-8 md:!p-12 shadow-2xl space-y-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 text-primary/5">
                    <Settings size={160} />
                </div>
                <div className="relative z-10">
                    <StageManager pipelineId={id} initialStages={stages} />
                </div>
            </div>

            <div className="p-8 rounded-3xl bg-primary/5 border border-primary/20 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <p className="card__sub-title !text-xs !mb-0 font-bold leading-relaxed tracking-wide flex items-start gap-4">
                <span className="bg-primary text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded shrink-0">Pro Tip</span> 
                <span>
                    Keep your pipeline simple (3-7 stages). Most leads get lost in overly complex workflows. 
                    Structure your stages based on concrete customer actions rather than internal activities.
                </span>
              </p>
            </div>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
