import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import MediaClient from './MediaClient';
import { getMediaFiles } from '@/app/actions/operations';
import { getCurrentWorkspaceId } from '@/lib/auth';

export default async function MediaPage() {
  const { data: files } = await getMediaFiles();
  const workspaceId = await getCurrentWorkspaceId();

  return (
    <MetaData pageTitle="Media Center">
      <Wrapper>
        <div className="app__slide-wrapper">
          <MediaClient initialFiles={files || []} workspaceId={workspaceId} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
