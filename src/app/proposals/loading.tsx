'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { ProposalsSkeleton } from '@/components/proposals/skeletons/ProposalsSkeleton';

export default function ProposalsLoading() {
  return (
    <MetaData pageTitle="Proposals">
      <Wrapper>
        <div className="app__slide-wrapper select-none">
          <div className="space-y-8">
            {/* Header Section Skeleton */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
              <div className="space-y-2">
                <div className="h-9 w-52 rounded-lg bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
                <div className="h-3.5 w-64 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
              </div>
              <div className="h-11 w-36 rounded-xl bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
            </div>

            {/* Master Detail Grid Skeleton */}
            <div className="h-full">
              <ProposalsSkeleton />
            </div>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
