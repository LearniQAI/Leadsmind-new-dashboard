import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import SocialInboxClient from './SocialInboxClient';

export default function SocialInboxPage() {
 return (
  <MetaData pageTitle="Social Inbox">
   <Wrapper>
    <SocialInboxClient />
   </Wrapper>
  </MetaData>
 );
}
