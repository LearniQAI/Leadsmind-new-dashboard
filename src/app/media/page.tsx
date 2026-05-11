import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import MediaClient from './MediaClient';
import { getMediaFiles } from '@/app/actions/operations';

export default async function MediaPage() {
  const { data: files } = await getMediaFiles();

  return (
    <MetaData pageTitle="Media Center">
      <Wrapper>
        <div className="app__slide-wrapper">
          <MediaClient initialFiles={files || []} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
