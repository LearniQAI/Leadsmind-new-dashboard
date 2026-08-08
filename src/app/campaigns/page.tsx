import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import CampaignsClient from './CampaignsClient';
import { getEmailCampaigns } from '@/app/actions/marketing';
import { listTags } from '@/app/actions/tags';
import { listSegments } from '@/app/actions/segments';

export default async function CampaignsPage() {
 const [{ data: campaigns }, tagsRes, segmentsRes] = await Promise.all([
  getEmailCampaigns(),
  listTags(),
  listSegments(),
 ]);
 const availableTags = tagsRes.success ? tagsRes.data : [];
 const availableSegments = segmentsRes.success ? segmentsRes.data : [];

 return (
  <MetaData pageTitle="Email Campaigns">
   <Wrapper>
    <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
     <CampaignsClient initialCampaigns={campaigns || []} availableTags={availableTags} availableSegments={availableSegments} />
    </div>
   </Wrapper>
  </MetaData>
 );
}
