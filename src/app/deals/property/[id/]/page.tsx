import { requireAuth, getCurrentWorkspaceId } from '@/lib/auth';
import { getPropertyDeal, getWorkspaceContacts } from '@/app/actions/propertyDeals';
import { getPipelineStages } from '@/app/actions/pipelines';
import { redirect } from 'next/navigation';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import PropertyDealClient from './PropertyDealClient';

export const dynamic = 'force-dynamic';

interface PropertyDealPageProps {
  params: { id: string };
}

export default async function PropertyDealPage({ params }: PropertyDealPageProps) {
  await requireAuth();
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) redirect('/auth/signin-basic');

  const dealRes = await getPropertyDeal(params.id);
  if (!dealRes.success || !dealRes.deal) {
    redirect('/pipelines');
  }

  // Retrieve all stages belonging to the active pipeline
  const pipelineId = dealRes.deal.stage?.pipeline_id || dealRes.deal.stage_id;
  const stagesRes = await getPipelineStages(pipelineId);
  const stages = stagesRes.success ? stagesRes.data || [] : [];

  // Fetch all contacts in the workspace
  const contacts = await getWorkspaceContacts();

  return (
    <MetaData pageTitle={`Real Estate Compliance | ${dealRes.deal.title}`}>
      <Wrapper>
        <div className="flex flex-col h-screen bg-[#04091a] overflow-hidden">
          <PropertyDealClient 
            initialDeal={dealRes.deal}
            initialBuyer={dealRes.buyer}
            initialSeller={dealRes.seller}
            initialShares={dealRes.shares || []}
            initialDeclarations={dealRes.declarations || []}
            stages={stages}
            contacts={contacts}
          />
        </div>
      </Wrapper>
    </MetaData>
  );
}
