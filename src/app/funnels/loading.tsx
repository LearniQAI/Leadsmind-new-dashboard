'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { FunnelsSkeleton } from '@/components/funnels/skeletons/FunnelsSkeleton';

export default function FunnelsLoading() {
  return (
    <MetaData pageTitle="Marketing Funnels">
      <Wrapper>
        <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] select-none">
          <FunnelsSkeleton />
        </div>
      </Wrapper>
    </MetaData>
  );
}
