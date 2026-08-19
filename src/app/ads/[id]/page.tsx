import React from 'react';
import { notFound } from 'next/navigation';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import { getAdCampaignById } from '@/app/actions/marketing';
import CampaignDetailClient from './CampaignDetailClient';

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: campaign, error } = await getAdCampaignById(id);

  if (error || !campaign) {
    notFound();
  }

  return (
    <MetaData pageTitle={campaign.name || 'Campaign'}>
      <Wrapper>
        <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-80px)]">
          <CampaignDetailClient initialCampaign={campaign} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
