import React, { Suspense } from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import FormsClient from './FormsClient';
import { getForms } from '@/app/actions/marketing';

export default async function FormsPage() {
 const { data: forms } = await getForms();

 return (
  <MetaData pageTitle="Forms">
   <Wrapper>
    <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
     <Suspense fallback={<div className="animate-pulse motion-reduce:animate-none flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-dash-surface rounded"></div></div></div>}>
      <FormsClient initialForms={forms || []} />
     </Suspense>
    </div>
   </Wrapper>
  </MetaData>
 );
}
