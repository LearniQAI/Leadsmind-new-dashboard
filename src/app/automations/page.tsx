import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import AutomationsClient from './AutomationsClient';
import { getWorkflows } from '@/app/actions/operations';

export default async function AutomationsPage() {
  const { data: workflows } = await getWorkflows();

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <AutomationsClient initialWorkflows={workflows || []} />
      </div>
    </Wrapper>
  );
}
