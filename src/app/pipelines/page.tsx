import { requireAuth, getCurrentWorkspace } from '@/lib/auth';
import {
  getPipelines,
  getPipelineStages,
  getPipelineOpportunities
} from '@/app/actions/pipelines';
import { redirect } from 'next/navigation';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import PipelineClient from './PipelineClient';

export const dynamic = 'force-dynamic';

export default async function PipelinesPage({
  searchParams,
}: {
  searchParams: { pipelineId?: string };
}) {
  await requireAuth();
  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect('/login');

  const pipelinesResult = await getPipelines();
  const pipelines = pipelinesResult.success ? pipelinesResult.data || [] : [];

  if (pipelines.length === 0) {
    return (
      <MetaData pageTitle="Pipelines">
        <Wrapper>
          <div className="flex flex-col h-[calc(100vh-200px)] items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-[#2563eb]/10 rounded-[2rem] flex items-center justify-center mb-4 shadow-2xl shadow-[#2563eb]/10 rotate-12">
              <i className="fa-solid fa-bullseye text-[32px] text-[#2563eb]"></i>
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-[#eef2ff] uppercase tracking-tight font-space-grotesk">No pipelines yet</h2>
              <p className="text-[#4a5a82] max-w-sm leading-relaxed font-dm-sans text-[13.5px]">
                Create your first sales pipeline to start tracking deals and moving prospects through stages.
              </p>
            </div>
            <button className="h-10 px-8 rounded-[12px] bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans flex items-center gap-2 transition-all shadow-lg shadow-[#2563eb]/20">
              <i className="fa-solid fa-plus text-[12px]"></i>
              Create Pipeline
            </button>
          </div>
        </Wrapper>
      </MetaData>
    );
  }

  const { pipelineId } = searchParams;
  const activePipelineId = pipelineId || pipelines[0].id;

  const [stagesResult, opportunitiesResult] = await Promise.all([
    getPipelineStages(activePipelineId),
    getPipelineOpportunities(activePipelineId)
  ]);

  const stages = stagesResult.success ? stagesResult.data || [] : [];
  const opportunities = opportunitiesResult.success ? opportunitiesResult.data || [] : [];

  return (
    <MetaData pageTitle="Strategic Pipelines">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          <PipelineClient 
            pipelines={pipelines}
            stages={stages}
            opportunities={opportunities}
            activePipelineId={activePipelineId}
          />
        </div>
      </Wrapper>
    </MetaData>
  );
}
