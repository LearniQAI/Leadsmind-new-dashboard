import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import SpeakersLibraryClient from './SpeakersLibraryClient';

export default async function SpeakersLibraryPage() {
  return (
    <Wrapper>
      <SpeakersLibraryClient />
    </Wrapper>
  );
}
