import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import AdsClient from './AdsClient';
import { getAdCampaigns } from '@/app/actions/marketing';

export default async function AdsPage() {
  const { data: campaigns } = await getAdCampaigns();

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <AdsClient initialCampaigns={campaigns || []} />
      </div>
    </Wrapper>
  );
}
