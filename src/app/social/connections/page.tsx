import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import SocialConnectionsClient from './SocialConnectionsClient';
import { getSocialAccounts } from '@/app/actions/social';

export default async function SocialConnectionsPage() {
 const accountsRes = await getSocialAccounts();

 return (
  <MetaData pageTitle="Social Connections">
   <Wrapper>
    <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-100px)]">
     <SocialConnectionsClient accounts={accountsRes.data || []} />
    </div>
   </Wrapper>
  </MetaData>
 );
}
