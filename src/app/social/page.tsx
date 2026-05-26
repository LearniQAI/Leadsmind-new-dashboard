import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import SocialPlannerClient from './SocialPlannerClient';
import { getSocialPosts, getSocialAccounts } from '@/app/actions/social';
import { getCurrentWorkspaceId } from '@/lib/auth';

export default async function SocialPage() {
 const [postsRes, accountsRes, workspaceId] = await Promise.all([
  getSocialPosts(),
  getSocialAccounts(),
  getCurrentWorkspaceId()
 ]);

 return (
  <Wrapper>
   <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-100px)]">
    <SocialPlannerClient 
     initialPosts={postsRes.data || []} 
     accounts={accountsRes.data || []} 
     workspaceId={workspaceId || ''}
    />
   </div>
  </Wrapper>
 );
}
