'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { WebsitesSkeleton } from '@/components/builder/skeletons/WebsitesSkeleton';

export default function WebsitesLoading() {
  return (
    <MetaData pageTitle="Websites | Leadsmind">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[var(--n900)] overflow-hidden">
          <WebsitesSkeleton />
        </div>
      </Wrapper>
    </MetaData>
  );
}
