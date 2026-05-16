import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import {
  getPipelines,
  getPipelineStages,
  getPipelineOpportunities
} from '@/app/actions/pipelines';
import { redirect } from 'next/navigation';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import PipelinesClient from './PipelinesClient';
import { getWorkspaceMembers } from '@/app/actions/workspace';
export const dynamic = 'force-dynamic';

export default async function PipelinesPage({
  searchParams,
}: {
  searchParams: { pipelineId?: string };
}) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/login');

  const supabase = await createServerClient();
  const pipelinesResult = await getPipelines();
  const pipelines = (pipelinesResult as any).success ? (pipelinesResult as any).data || [] : [];

  if (pipelines.length === 0) {
    return (
      <MetaData pageTitle="Strategic Pipelines">
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
  const activePipeline = pipelines.find((p: any) => p.id === activePipelineId) || pipelines[0];

  const [stagesResult, opportunitiesResult, contactsRes, members] = await Promise.all([
    getPipelineStages(activePipelineId),
    getPipelineOpportunities(activePipelineId),
    supabase.from('contacts').select('*').eq('workspace_id', workspaceId).order('first_name'),
    getWorkspaceMembers()
  ]);

  const stages = (stagesResult as any).success ? (stagesResult as any).data || [] : [];
  const opportunities = (opportunitiesResult as any).success ? (opportunitiesResult as any).data || [] : [];
  const contacts = contactsRes.data || [];

  return (
    <MetaData pageTitle={`Sales Pipeline | ${activePipeline.name}`}>
      <Wrapper>
        <div className="flex flex-col h-screen bg-[#04091a] overflow-hidden">
          <PipelinesClient 
            pipelines={pipelines}
            activePipeline={activePipeline}
            initialStages={stages}
            initialOpportunities={opportunities}
            contacts={contacts}
            members={members}
          />
        </div>
      </Wrapper>
    </MetaData>
  );
}
