import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import SocialAnalyticsClient from './SocialAnalyticsClient';

export default function SocialAnalyticsPage() {
 return (
  <MetaData pageTitle="Social Analytics">
   <Wrapper>
    <div className="p-6 max-w-5xl mx-auto font-body min-h-[calc(100vh-100px)]">
     <SocialAnalyticsClient />
    </div>
   </Wrapper>
  </MetaData>
 );
}
