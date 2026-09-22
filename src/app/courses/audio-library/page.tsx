import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import AudioLibraryClient from './AudioLibraryClient';

export default async function AudioLibraryPage() {
  return (
    <Wrapper>
      <AudioLibraryClient />
    </Wrapper>
  );
}
