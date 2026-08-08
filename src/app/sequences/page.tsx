import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import SequencesClient from './SequencesClient';
import { listSequences } from '@/app/actions/email_sequences';

export const dynamic = 'force-dynamic';

export default async function SequencesPage() {
  const result = await listSequences();

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
        <SequencesClient initialSequences={result.success ? result.data : []} />
      </div>
    </Wrapper>
  );
}
