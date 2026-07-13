'use client';

import React from 'react';
import MetaData from '@/hooks/useMetaData';
import Wrapper from '@/components/layouts/DefaultWrapper';
import { PipelinesSkeleton } from '@/components/kanban/skeletons/PipelinesSkeleton';

export default function PipelinesLoading() {
  return (
    <MetaData pageTitle="Strategic Pipelines">
      <Wrapper>
        <div className="flex flex-col h-screen bg-white overflow-hidden">
          <PipelinesSkeleton />
        </div>
      </Wrapper>
    </MetaData>
  );
}
