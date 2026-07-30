import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import CampaignsClient from './CampaignsClient';
import { getEmailCampaigns } from '@/app/actions/marketing';
import { listTags } from '@/app/actions/tags';

export default async function CampaignsPage() {
 const [{ data: campaigns }, tagsRes] = await Promise.all([
  getEmailCampaigns(),
  listTags(),
 ]);
 const availableTags = tagsRes.success ? tagsRes.data : [];

 return (
  <MetaData pageTitle="Email Campaigns">
   <Wrapper>
    <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
     <CampaignsClient initialCampaigns={campaigns || []} availableTags={availableTags} />
    </div>
   </Wrapper>
  </MetaData>
 );
}
