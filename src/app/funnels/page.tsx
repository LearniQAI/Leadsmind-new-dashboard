import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import FunnelsClient from './FunnelsClient';
import { getFunnels } from '@/app/actions/marketing';

export default async function FunnelsPage() {
 const { data: funnels } = await getFunnels();

 return (
  <MetaData pageTitle="Marketing Funnels">
   <Wrapper>
    <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
     <FunnelsClient initialFunnels={funnels || []} />
    </div>
   </Wrapper>
  </MetaData>
 );
}
