import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import PodcastAdminClient from './PodcastAdminClient';

export default async function PodcastAdminPage() {
  return (
    <Wrapper>
      <PodcastAdminClient />
    </Wrapper>
  );
}
