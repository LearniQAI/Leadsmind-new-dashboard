import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ForumsClient from './ForumsClient';
import { getForumPosts } from '@/app/actions/forum';

export default async function ForumsPage() {
  const { data: posts } = await getForumPosts('Ask a Question');

  return (
    <MetaData pageTitle="Community Forums">
      <Wrapper>
        <div className="app__slide-wrapper px-4 md:px-8 py-8">
          <ForumsClient initialPosts={posts || []} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
