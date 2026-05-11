import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import ForumsClient from './ForumsClient';
import { getForumPosts } from '@/app/actions/lms';

export default async function ForumsPage() {
  const { data: posts } = await getForumPosts();

  return (
    <MetaData pageTitle="Community Forums">
      <Wrapper>
        <div className="app__slide-wrapper">
          <ForumsClient initialPosts={posts || []} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
