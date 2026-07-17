import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import CampaignsClient from './CampaignsClient';
import { getEmailCampaigns } from '@/app/actions/marketing';

export default async function CampaignsPage() {
 const { data: campaigns } = await getEmailCampaigns();

 return (
  <MetaData pageTitle="Email Campaigns">
   <Wrapper>
    <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
     <CampaignsClient initialCampaigns={campaigns || []} />
    </div>
   </Wrapper>
  </MetaData>
 );
}
