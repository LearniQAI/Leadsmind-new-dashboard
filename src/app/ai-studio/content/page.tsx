import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import AiStudioClient from './AiStudioClient';

export default function AiStudioPage() {
  return (
    <MetaData pageTitle="AI Production Studio">
      <AiStudioClient />
    </MetaData>
  );
}
