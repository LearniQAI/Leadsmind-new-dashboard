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
import { EmptyPipelines } from './components/EmptyPipelines';
export const dynamic = 'force-dynamic';

export default async function PipelinesPage({
  searchParams,
}: {
  searchParams: { pipelineId?: string };
}) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const supabase = await createServerClient();
  const pipelinesResult = await getPipelines();
  const pipelines = (pipelinesResult as any).success ? (pipelinesResult as any).data || [] : [];

  if (pipelines.length === 0) {
    return (
      <MetaData pageTitle="Strategic Pipelines">
        <Wrapper>
          <EmptyPipelines />
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
