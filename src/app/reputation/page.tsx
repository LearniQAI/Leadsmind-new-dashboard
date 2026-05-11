import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ReputationClient from './ReputationClient';
import { getReviews } from '@/app/actions/marketing';

export default async function ReputationPage() {
 const { data: reviews } = await getReviews();

 return (
  <Wrapper>
   <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
    <ReputationClient initialReviews={reviews || []} />
   </div>
  </Wrapper>
 );
}
