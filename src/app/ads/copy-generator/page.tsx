import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import AdCopyGeneratorClient from './AdCopyGeneratorClient';
import { getAdCampaigns } from '@/app/actions/marketing';

export default async function AdCopyGeneratorPage() {
  const { data: campaigns } = await getAdCampaigns();

  return (
    <MetaData pageTitle="Ad Copy Generator">
      <Wrapper>
        <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-80px)]">
          <AdCopyGeneratorClient initialCampaigns={campaigns || []} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
